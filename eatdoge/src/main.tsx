import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import dogePng from '../../doge.png'

const iconLink = document.querySelector("link[rel='icon']") ?? document.createElement('link')
iconLink.setAttribute('rel', 'icon')
iconLink.setAttribute('type', 'image/png')
iconLink.setAttribute('href', dogePng)
document.head.appendChild(iconLink)

const ogImage = document.createElement('meta')
ogImage.setAttribute('property', 'og:image')
ogImage.setAttribute('content', dogePng)
document.head.appendChild(ogImage)

const twitterImage = document.createElement('meta')
twitterImage.setAttribute('name', 'twitter:image')
twitterImage.setAttribute('content', dogePng)
document.head.appendChild(twitterImage)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App dogeSrc={dogePng} />
  </React.StrictMode>,
)
