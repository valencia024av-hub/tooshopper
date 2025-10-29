import { useEffect, useState } from 'react'
import './hero.css'

const videos = [
  '/video1.mp4',
  '/video2.mp4',
  '/video3.mp4',
]

function Hero() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % videos.length)
    }, 7000) // cambia cada 7 segundos

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="hero-slider">
      {videos.map((video, index) => (
        <video
          key={index}
          src={video}
          autoPlay
          loop
          muted
          className={index === current ? 'active' : 'inactive'}
        />
      ))}

      <div className="dots">
        {videos.map((_, index) => (
          <span
            key={index}
            onClick={() => setCurrent(index)}
            className={index === current ? 'dot active' : 'dot'}
          ></span>
        ))}
      </div>
    </section>
  )
}

export default Hero
