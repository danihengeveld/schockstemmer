import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SchockStemmer",
    short_name: "SchockStemmer",
    description: "The ultimate Schocken companion app.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/apple-icon.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}