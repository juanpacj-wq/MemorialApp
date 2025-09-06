// src/components/YouTubePlayer.js
"use client";

const YouTubePlayer = ({ url }) => {
  if (!url) return null;

  const videoId = url.match(/(?:youtube\.com.*[\?&]v=|youtu\.be\/)([^&\n?#]+)/)?.[1];

  if (!videoId) return <p className="text-sm text-red-500">URL de YouTube inválida.</p>;

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="mt-4">
      <iframe
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Reproductor de YouTube"
        className="w-full h-48 rounded-lg"
      ></iframe>
    </div>
  );
};

export default YouTubePlayer;