import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  const [publicAPI, setPublicAPI] = useState<{
    osuClientID: string
    lastFMApiKey: string
  }>()

  const BASE_REDIRECT = "https://fm.heyn.live/api/"

  useEffect(() => {
    fetch("/api/getPublicAPI")
      .then((res) => res.json())
      .then((data) => setPublicAPI(data))
  },[])

	return (
		<main>
			<button onClick={()=>{window.location.href=`https://osu.ppy.sh/oauth/authorize?client_id=${publicAPI!.osuClientID}&redirect_uri=${BASE_REDIRECT+encodeURIComponent("osuauth")}&response_type=code&scope=public`}}>
			  Log in with osu!
      </button><br></br>
      <button onClick={()=>{window.location.href=`https://last.fm/api/auth?api_key=${publicAPI!.lastFMApiKey}`}}>
        Log in with last.fm!
      </button><br></br>
      <button onClick={()=>{fetch(window.location.origin+"/api/linkAccounts")}}>
        Link accounts
      </button><br></br>
      <button>
        Unlink accounts
			</button>
		</main>
	)
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
