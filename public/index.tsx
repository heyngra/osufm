import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Helmet } from 'react-helmet'

interface PublicAPI {
  osuClientID: string
  lastFMApiKey: string
}

interface LinkStatus {
  linked: boolean
  reason?: string
}

interface AuthState {
  osu: boolean
  lastFM: boolean
}

function App() {
  const [publicAPI, setPublicAPI] = useState<PublicAPI | null>(null)
  const [authState, setAuthState] = useState<AuthState>({ osu: false, lastFM: false })
  const [linkStatus, setLinkStatus] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const BASE_REDIRECT = "https://fm.heyn.live/api/"

  useEffect(() => {
    fetch("/api/getPublicAPI")
      .then((res) => res.json())
      .then((data) => setPublicAPI(data))

    checkCookies()
  }, [])

  const checkCookies = () => {
    const osu = document.cookie.includes('osuToken=')
    const lastFM = document.cookie.includes('lastFMToken=')
    setAuthState({ osu, lastFM })

    if (osu && lastFM) {
      fetch("/api/checkLinkStatus")
        .then((res) => res.json())
        .then((data: LinkStatus) => {
          console.log("Link status response:", data)
          setLinkStatus(data.linked)
        })
    } else {
      setLinkStatus(null)
    }
  }

  const handleLink = async () => {
    setLoading(true)
    await fetch(window.location.origin + "/api/linkAccounts")
    setLoading(false)
    checkCookies()
  }

  const handleUnlink = async () => {
    setLoading(true)
    await fetch(window.location.origin + "/api/unlinkAccounts")
    setLoading(false)
    checkCookies()
  }

  const handleDeleteOsu = async () => {
    if (!confirm("Are you sure you want to delete your osu! account from the database?")) return
    setLoading(true)
    await fetch(window.location.origin + "/api/deleteOsuAccount")
    setLoading(false)
    checkCookies()
  }

  const handleDeleteLastFM = async () => {
    if (!confirm("Are you sure you want to delete your last.fm account from the database?")) return
    setLoading(true)
    await fetch(window.location.origin + "/api/deleteLastFMAccount")
    setLoading(false)
    checkCookies()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center py-12 px-4">
      <Helmet>
        <title>osu!fm</title>
        <meta name="title" content="osu!fm - Your osu! scrobbler" />
        <meta name="description" content="Scrobble your osu! plays directly to last.fm!"></meta>
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="osu!fm - Your osu! scrobbler" />
        <meta property="og:description" content="Scrobble your osu! plays directly to last.fm!" />
        <meta property="og:url" content="https://fm.heyn.live" />
        <meta property="og:site_name" content="osu!fm" />
      </Helmet>
      <div className="max-w-xl w-full">
        <h1 className="text-4xl font-bold text-pink-600 text-center mb-2 animate-[slideUp_0.5s_ease-out]">
          osu!fm
        </h1>
        <div className="text-pink-400 text-center mb-8 animate-[slideUp_0.5s_ease-out_0.1s_both]">
          Scrobble your osu! plays live to Last.fm
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6 mb-6 hover:shadow-xl transition-shadow duration-300 animate-[slideUp_0.5s_ease-out_0.2s_both]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-pink-700">
              Settings
            </h2>
            {linkStatus && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Linked
              </span>
            )}
          </div>

          <div className="space-y-3">
            {authState.osu ? (
              <div className="flex gap-3">
                <button
                  disabled
                  className="flex-3 py-3 px-4 rounded-xl font-medium bg-green-100 text-green-700 border border-green-200 cursor-default"
                >
                  osu! connected
                </button>
                <button
                  onClick={handleDeleteOsu}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => window.location.href = `https://osu.ppy.sh/oauth/authorize?client_id=${publicAPI!.osuClientID}&redirect_uri=${BASE_REDIRECT + encodeURIComponent("osuauth")}&response_type=code&scope=public`}
                disabled={!publicAPI}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700 shadow-md hover:shadow-lg hover:cursor-pointer ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                Connect osu!
              </button>
            )}

            {authState.lastFM ? (
              <div className="flex gap-3">
                <button
                  disabled
                  className="flex-3 py-3 px-4 rounded-xl font-medium bg-green-100 text-green-700 border border-green-200 cursor-default"
                >
                  Last.fm connected
                </button>
                <button
                  onClick={handleDeleteLastFM}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => window.location.href = `https://last.fm/api/auth?api_key=${publicAPI!.lastFMApiKey}`}
                disabled={!publicAPI}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700 shadow-md hover:shadow-lg hover:cursor-pointer ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                Connect Last.fm
              </button>
            )}

            <div className="h-px bg-pink-100 my-4" />

            {authState.osu && authState.lastFM ? (
              linkStatus ? (
                <button
                  onClick={handleUnlink}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-medium bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-wait hover:cursor-pointer"
                >
                  {loading ? 'Unlinking...' : 'Unlink Accounts'}
                </button>
              ) : (
                <button
                  onClick={handleLink}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-medium bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? 'Linking...' : 'Link Accounts'}
                </button>
              )
            ) : (
              <div className="text-center text-pink-400 text-sm py-2">
                Connect both accounts to unlock linking.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6 hover:shadow-xl transition-shadow duration-300 animate-[slideUp_0.5s_ease-out_0.3s_both]">
          <h2 className="text-3xl font-semibold text-pink-700 mb-3 border-l-6 border-pink-400 pl-3 mt-6">
            About
          </h2>
          <div className="text-pink-600 text-md leading-relaxed">
            <a href="https://last.fm" target="_blank" className="text-purple-600 font-bold hover:underline decoration-purple-400 underline-offset-2 transition-all">Last.fm</a> is a website that allows everyone with an account to save each song they have listened to, and track all data related to music usage. What if you scrobble it from <b>osu!</b>?
          </div>
          <div className="text-pink-600 text-md leading-relaxed">
            That's where <b>osu!fm</b> comes, a site which allows you to scrobble played songs from <b>osu!</b> with no hassle. Linking your osu! and last.fm account is enough to enjoy your osu! scrobbles.
          </div>
          <h2 className="text-2xl font-semibold text-pink-700 mb-3 border-l-4 border-pink-400 pl-3 mt-6">
            How does it work?
          </h2>
          <div className="text-pink-600 text-md leading-relaxed">
            This site does not do any black magic, and <span title="hi, it's me, heyn!">I</span> would be ashamed if something like that took place, really. This app uses <a className="text-purple-600 font-bold hover:underline decoration-purple-400 underline-offset-2 transition-all" href="https://osu.ppy.sh/docs/index.html#get-scores102" target="_blank">"Get Scores"</a> API endpoint to gather your scores, and last.fm's scrobble API to upload them to your account.
          </div>
          <h2 className="text-2xl font-semibold text-pink-700 mb-3 border-l-4 border-pink-400 pl-3 mt-6">
            Security, privacy policy, etc.
          </h2>
          <div className="text-pink-600 text-md leading-relaxed">
            Don't be afraid, I'm not storing any vulnerable data on my site. Data stored here:
          </div>
          <ul className="list-disc list-inside space-y-2 text-pink-600 text-md mt-2 ml-2">
            <li>
              osu! API token obtained from logging in
              <span className="text-gray-500 text-xs block ml-4">(This token only allows for reading data, such as your scores' details. These are not your <b>LOGIN DETAILS</b>, and even if you forget about this site, you can revoke it using your osu! settings.)</span>
            </li>
            <li>
              last.fm API token obtained from logging in
              <span className="text-gray-500 text-xs block ml-4">(Same case as above, however this can token can obviously be used to write new scrobbles to your account. It will ONLY be used when you submit a new score, but if you are uncertain, then you can revoke it in your last.fm account settings.)</span>
            </li>
            <li title="My ID is 10494504">
              Your osu! ID
            </li>
            <li>
              Your last.fm username (it serves as an ID)
            </li>
          </ul>
          <div className="text-pink-600 text-md leading-relaxed">
            Still unsure? You can always check the source code down below! &lt;3
          </div>
          <h2 className="text-2xl font-semibold text-pink-700 mb-3 border-l-4 border-pink-400 pl-3 mt-6">
            Issues?
          </h2>
          <div className="text-pink-600 text-md leading-relaxed">
            If there are any issues or questions related to this website, you can send them to me:
            <ul className="list-disc list-inside space-y-2 text-pink-600 text-md mt-2 ml-2">
              <li>
                Using <a href="https://github.com/heyngra/osufm/issues" target="_blank" className="text-purple-600 font-bold hover:underline decoration-purple-400 underline-offset-2 transition-all">GitHub Issues</a>
                <span className="text-gray-500 text-xs block ml-4">(Please try to leave it mostly for code issues)</span>
              </li>
              <li>
                <a href="https://discord.heyn.live" target="_blank" className="text-purple-600 font-bold hover:underline decoration-purple-400 underline-offset-2 transition-all">Discord</a>
              </li>
              <li>
                <a href="mailto:heyn@heyn.live" target="_blank" className="text-purple-600 font-bold hover:underline decoration-purple-400 underline-offset-2 transition-all">E-Mail</a>
              </li>
              <li>
                Or alternatively, you can PM me on osu!, but I can't guarantee a quick response.
              </li>
            </ul>
            <span className="text-xs">I cannot guarantee any SLA as this app is hosted on my small personal server. Small outages or blackouts might happen. If in need, contact me using methods written above.</span>
          </div>
        </div>

        <footer className="mt-8 text-center animate-[slideUp_0.5s_ease-out_0.4s_both]">
          <div className="flex justify-center gap-4 mb-3">
            <a href="https://github.com/heyngra/osufm" target="_blank" className="text-pink-500 hover:text-pink-700 transition-colors transform hover:scale-110"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            <a href="https://twitter.com/heyngra" target="_blank" className="text-pink-500 hover:text-pink-700 transition-colors transform hover:scale-110">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <div className="text-pink-400 text-sm">
            Made with ♡ by <a href="https://osu.ppy.sh/u/heyn" target="_blank"> heyn</a>
          </div>
          <div className="text-pink-400 text-sm">
            Not affiliated with osu! or ppy Pty Ltd.
          </div>
        </footer>
      </div>
    </main>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
