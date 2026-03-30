<div align="center">
  <h1><a href="https://fm.heyn.live">osu!fm</a></h1>
  Scrobble your osu! scores live to last.fm!
  <video src="https://github.com/user-attachments/assets/a28b51a1-7025-48cd-866f-6e51efd3a84f"></video>
</div>
<h2>About</h2>
Have you ever used last.fm? Usually, you can use it to save your listening history from f.e. Spotify or YouTube. But what if you wanted to store your awesome osu! pp grind or some classics? osu!fm has got you covered.
<h2>How does this site work?</h2>
On the website itself there is a short version of this descrpition, but here I can go more in-depth.
<ol>
  <li>You connect both of your accounts and add them to my database.</li>
  <li>By clicking "Link Accounts" you create a connection between your osu! account and last.fm account.</li>
  <li>Using Get Scores osu!api endpoint this site checks every new score submitted. If it happens to be yours, then...</li>
  <li>This site checks the song details, and uses your last.fm API key to add a new scrobble to your account.</li>
</ol>
<h2>Contributing</h2>
If you have any issues with the site, something is not yes, or you want to improve something then don't be scared to make a PR! I will take a good look into it, and if it's good, then I will probably merge it. This site was made in a day, so please don't expect the highest standards from the code itself.
<h2>Development</h2>
This app uses Elysia, with Bun and React under the hood. To run this app, download Bun and install dependencies using <code>bun install</code>. Then run your app normally using <code>bun run dev</code>. Remember to fill out <code>.env</code>.
<h2>Funding</h2>
This website is funded directly by me on my personal private Raspberry PI. However, if you'd want to help me pay my bills just a little bit, then you can sponsor my account using that juicy sponsor button. No pressure tho, this app will always be free to use.
<h2>Disclaimer</h2>
This app is not affiliated with osu! or ppy Pty Ltd.
