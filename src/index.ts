import staticPlugin from "@elysiajs/static";
import { sleep } from "bun";
import Database from "bun:sqlite";
import { Elysia } from "elysia";
import { createHash } from "node:crypto";
const sqlite = new Database("sqlite.db");
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON");

sqlite.run("CREATE TABLE IF NOT EXISTS osuAPI(ID int primary key, TOKEN text, EXPIRES_IN int, REFRESH_TOKEN text)")
sqlite.run("CREATE TABLE IF NOT EXISTS lastFMAPI(NAME text primary key, TOKEN text)")
sqlite.run("CREATE TABLE IF NOT EXISTS mergedAccounts(ID int primary key, osuAPI_ID int, lastFMAPI_NAME text, FOREIGN KEY (osuAPI_ID) REFERENCES osuAPI(ID) ON DELETE CASCADE, FOREIGN KEY (lastFMAPI_NAME) REFERENCES lastFMAPI(NAME) ON DELETE CASCADE)")

const apiGetRequest = async (path: string, token: string) => {
  const response = await fetch(`https://osu.ppy.sh${path}`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`
    },
  });
  return response.json();
}

const renewOsuToken = async (refresh_token: string) => {
  try {
    refresh_token = refresh_token["REFRESH_TOKEN"];
    const response = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.OSU_CLIENT_ID!,
        client_secret: process.env.OSU_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: "refresh_token",
      }),
    })
    if (response.status == 401) {
      sqlite.run("DELETE FROM osuAPI where REFRESH_TOKEN=?", [refresh_token]);
      return false;
    }
    const json = await response.json();
    sqlite.run("UPDATE osuAPI SET TOKEN = ?, REFRESH_TOKEN = ?, EXPIRES_IN = ? WHERE REFRESH_TOKEN = ?", [json.access_token, json.refresh_token, (Date.now()/1000)+json.expires_in, refresh_token]);
    return json.access_token
  } catch (e) {
    if (e.message.includes("null is not an object (evaluating 'refresh_token.REFRESH_TOKEN')")) {
      return false;
    }
    console.error(e);
    return false;
  }
}

let Cursor_string = "";

const fetchScores = async () => {
  let token = sqlite.query("SELECT token FROM osuAPI WHERE EXPIRES_IN > ? ORDER BY RANDOM() LIMIT 1").get(Date.now() / 1000);
  if (token != null) {
    token = token["TOKEN"]
    const json = await apiGetRequest(`/api/v2/scores?cursor_string=${Cursor_string}`, token);
    const { scores, cursor_string } = json;
    Cursor_string = cursor_string;
    console.log("Checked scores: " + scores.length);
    let scrobbledScores = 0;
    for (const score of scores) {
      let lastFMName = sqlite.query("SELECT lastFMAPI_NAME from mergedAccounts where osuAPI_ID = ?").get(score.user_id)
      if (lastFMName == null) continue
      let trueToken = sqlite.query("SELECT token, refresh_token, EXPIRES_IN FROM osuAPI WHERE ID = ?").get(score.user_id);
      if (trueToken == null) {
        trueToken = { TOKEN: token };
      } else if (trueToken["EXPIRES_IN"] < Date.now() / 1000) {
        trueToken = { TOKEN: await renewOsuToken(trueToken["refresh_token"]) }; // can't test if it works, hopefully it does
      }
      lastFMName = lastFMName["lastFMAPI_NAME"];
      let lastFMToken = sqlite.query("SELECT TOKEN from lastFMAPI where name = ?").get(lastFMName);
      if (lastFMToken == null) continue
      const beatmap = await apiGetRequest(`/api/v2/beatmaps/${score.beatmap_id}`, trueToken["TOKEN"]);
      if (beatmap.total_length >= 30) {
        let body = `api_key${process.env.FM_API_KEY}artist${beatmap.beatmapset.artist_unicode}methodtrack.scrobblesk${lastFMToken["TOKEN"]}timestamp${Math.floor(new Date(score.ended_at).getTime() / 1000)}track${beatmap.beatmapset.title_unicode}${process.env.FM_SECRET}`
        let sig = createHash("md5").update(body).digest("hex")
        body = `method=track.scrobble&api_key=${process.env.FM_API_KEY}&api_sig=${sig}&artist=${beatmap.beatmapset.artist_unicode}&sk=${lastFMToken["TOKEN"]}&timestamp=${Math.floor(new Date(score.ended_at).getTime() / 1000)}&track=${beatmap.beatmapset.title_unicode}&format=json`
        await fetch("https://ws.audioscrobbler.com/2.0", {
          method: "POST",
          headers: {
            "User-Agent": "osu-fm"
          },
          body: body
        }).then(r => r.json()).then(r => {
          scrobbledScores += 1;
        }).catch(e => console.error(e))
      }
      if (scrobbledScores > 0) {
        console.log(`Scrobbled ${scrobbledScores} songs!`);
      }
    }
  } else {
    await renewOsuToken(sqlite.query("SELECT refresh_token FROM osuAPI ORDER BY RANDOM() LIMIT 1").get());
    //fetchScores();
  }
};

setInterval(fetchScores, 5000);

const app = new Elysia()
  .get("/api/getPublicAPI", {
    osuClientID: process.env.OSU_CLIENT_ID,
    lastFMApiKey: process.env.FM_API_KEY
  })
  .get("/api/osuauth", async (context) => {
    const query = context.query;
    const response = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.OSU_CLIENT_ID!,
        client_secret: process.env.OSU_CLIENT_SECRET!,
        code: query.code as string,
        grant_type: "authorization_code",
        redirect_uri: "https://fm.heyn.live/api/osuauth",
      }),
    })
    const json = await response.json();
    const { access_token, expires_in, refresh_token } = json;

    const user = await apiGetRequest("/api/v2/me", access_token);
    if (user) {
      const id: number = user.id;
      const existing = sqlite.query("SELECT ID FROM osuAPI WHERE ID = ?").get(id);
      if (existing) {
        sqlite.run("UPDATE osuAPI SET TOKEN = ?, EXPIRES_IN = ?, REFRESH_TOKEN = ? WHERE ID = ?", [access_token, (Date.now()/1000)+expires_in, refresh_token, id]);
      } else {
        sqlite.run("INSERT INTO osuAPI(ID, TOKEN, EXPIRES_IN, REFRESH_TOKEN) VALUES(?, ?, ?, ?)", [id, access_token, (Date.now()/1000)+expires_in, refresh_token]);
      }
      context.cookie.osuToken.value = access_token;
      return context.redirect("/")
    }
    return context.status(403)
  })
  .get("/lastfmauth", async (context) => { // this should contain /api/ but I forgot to add it while creating the API account, oops!
    if (!context.query.token) {
      return context.status(404);
    }
    const sig = createHash("md5").update(`api_key${process.env.FM_API_KEY}methodauth.getSessiontoken${context.query.token}${process.env.FM_SECRET}`).digest("hex");
    const request = await fetch(`https://ws.audioscrobbler.com/2.0?method=auth.getSession&token=${context.query.token}&api_key=${process.env.FM_API_KEY}&api_sig=${sig}&format=json`, {
      headers: {
        "User-Agent": "osu-fm"
      },
    })
    let json = await request.json();
    json = json["session"];
    const { name, key } = json;
    if (json && json.subscriber == 0) {
      const existing = sqlite.query("SELECT NAME FROM lastFMAPI WHERE NAME = ?").get(name);
      if (existing) {
        sqlite.run("UPDATE lastFMAPI SET TOKEN = ? WHERE NAME = ?", [key, name]);
      } else {
        sqlite.run("INSERT INTO lastFMAPI(NAME, TOKEN) VALUES (?, ?)", [name, key]);
      }
      context.cookie.lastFMToken.value = key;
      return context.redirect("/");
    }
    return context.status(404);

  })
  .get("/api/linkAccounts", async (context) => {
    const osuToken = context.cookie.osuToken.value as string | undefined;
    const lastFMToken = context.cookie.lastFMToken.value as string | undefined;

    if (!osuToken || !lastFMToken) {
      return context.status(400);
    }

    try {
      const osuUser = sqlite.query("SELECT ID FROM osuAPI WHERE TOKEN = ?").get(osuToken) as { ID: number } | null;
      const fmUser = sqlite.query("SELECT NAME FROM lastFMAPI WHERE TOKEN = ?").get(lastFMToken) as { NAME: string } | null;

      if (!osuUser || !fmUser) {
        return { error: "Accounts not found in database. Please login again." };
      }

      sqlite.run(
        "INSERT OR REPLACE INTO mergedAccounts (osuAPI_ID, lastFMAPI_NAME) VALUES (?, ?)",
        [osuUser.ID, fmUser.NAME]
      );

      return { success: true };
    } catch (e) {
      console.error(e);
      context.set.status = 500;
      return { error: "Internal Server Error" };
    }
  })
  .get("/api/unlinkAccounts", async (context) => {
    if (context.cookie.osuToken.value || context.cookie.lastFMToken.value) {
      sqlite.run(
        `DELETE FROM mergedAccounts
          WHERE osuAPI_ID = (SELECT ID FROM osuAPI WHERE TOKEN = ?)
            OR lastFMAPI_NAME = (SELECT NAME FROM lastFMAPI WHERE TOKEN = ?)`,
        [context.cookie.osuToken.value as string ?? null, context.cookie.lastFMToken.value as string ?? null]
      );
      return context.status(200);
    }
    return context.status(401);
  })
  .get("/api/checkLinkStatus", async (context) => {
    const osuToken = context.cookie.osuToken.value as string | undefined;
    const lastFMToken = context.cookie.lastFMToken.value as string | undefined;

    if (!osuToken || !lastFMToken) {
      return { linked: false, reason: "missing_tokens" };
    }

    const osuUser = sqlite.query("SELECT ID FROM osuAPI WHERE TOKEN = ?").get(osuToken) as { ID: number } | null;
    const fmUser = sqlite.query("SELECT NAME FROM lastFMAPI WHERE TOKEN = ?").get(lastFMToken) as { NAME: string } | null;

    if (!osuUser) {
      return { linked: false, reason: "osu_account_not_found" };
    }
    if (!fmUser) {
      return { linked: false, reason: "lastfm_account_not_found" };
    }

    const existingLink = sqlite.query(
      "SELECT ID FROM mergedAccounts WHERE osuAPI_ID = ? AND lastFMAPI_NAME = ?"
    ).get(osuUser.ID, fmUser.NAME);

    return { linked: !!existingLink };
  })
  .get("/api/deleteOsuAccount", async (context) => {
    const osuToken = context.cookie.osuToken.value as string | undefined;

    if (!osuToken) {
      return context.status(401);
    }

    const osuUser = sqlite.query("SELECT ID FROM osuAPI WHERE TOKEN = ?").get(osuToken) as { ID: number } | null;

    if (osuUser) {
      sqlite.run("DELETE FROM mergedAccounts WHERE osuAPI_ID = ?", [osuUser.ID]);
      sqlite.run("DELETE FROM osuAPI WHERE TOKEN = ?", [osuToken]);
    }

    context.cookie.osuToken.remove()
    return { success: true };
  })
  .get("/api/deleteLastFMAccount", async (context) => {
    const lastFMToken = context.cookie.lastFMToken.value as string | undefined;

    if (!lastFMToken) {
      return context.status(401);
    }

    const fmUser = sqlite.query("SELECT NAME FROM lastFMAPI WHERE TOKEN = ?").get(lastFMToken) as { NAME: string } | null;

    if (fmUser) {
      sqlite.run("DELETE FROM mergedAccounts WHERE lastFMAPI_NAME = ?", [fmUser.NAME]);
      sqlite.run("DELETE FROM lastFMAPI WHERE TOKEN = ?", [lastFMToken]);
    }

    context.cookie.lastFMToken.remove()
    return { success: true };
  })
  .use(await staticPlugin({
    prefix:'/'
  }))
  .listen(process.env.PORT??3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
