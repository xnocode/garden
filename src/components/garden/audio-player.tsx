"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2, Gauge } from "lucide-react";

interface AudioPlayerProps {
  text: string;
  title: string;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export function AudioPlayer({ text, title }: AudioPlayerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cleanTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
  }, []);

  // Clean Markdown syntax for natural audio reading
  const cleanMarkdown = (raw: string): string => {
    return raw
      .replace(/---[\s\S]*?---/, "") // Strip frontmatter
      .replace(/#+\s+/g, "") // Strip headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links -> link text
      .replace(/!\[\[[^\]]+\]\]|\[\[[^\]]+\]\]/g, "") // Strip wikilinks/embeds
      .replace(/`{3}[\s\S]*?`{3}/g, "Code block omitted.") // Strip code blocks
      .replace(/`([^`]+)`/g, "$1") // Inline code
      .replace(/[*_~=]/g, "") // Formatting chars
      .replace(/<[^>]+>/g, "") // HTML tags
      .replace(/\n+/g, " ") // Clean linebreaks
      .trim();
  };

  // Stop speech when component unmounts or text changes
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  const handlePlayPause = () => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;

    // If currently paused -> resume
    if (isPlaying && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    // If currently playing -> pause
    if (isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    // Start fresh playback
    synth.cancel(); // Stop any ongoing speech
    const plainText = `${title}. ${cleanMarkdown(text)}`;
    cleanTextRef.current = plainText;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = SPEEDS[speedIndex];
    utteranceRef.current = utterance;

    utterance.onboundary = (event) => {
      if (event.name === "word" && plainText.length > 0) {
        const pct = Math.min(100, Math.round((event.charIndex / plainText.length) * 100));
        setProgress(pct);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handleStop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  };

  const toggleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIdx);
    const newSpeed = SPEEDS[nextIdx];

    if (isPlaying && utteranceRef.current) {
      // Re-apply speed during active playback
      window.speechSynthesis.cancel();
      const plainText = cleanTextRef.current;
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = newSpeed;
      utteranceRef.current = utterance;

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
      };

      window.speechSynthesis.speak(utterance);
      setIsPaused(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="not-prose my-4 rounded-xl border border-border/80 bg-surface/40 p-3.5 shadow-sm backdrop-blur-md transition-all hover:border-garden/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePlayPause}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-garden text-background font-medium shadow-sm transition-transform hover:scale-105 active:scale-95"
            aria-label={isPlaying && !isPaused ? "Pause audio" : "Listen to note"}
            title={isPlaying && !isPaused ? "Pause audio" : "Listen to note"}
          >
            {isPlaying && !isPaused ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>

          {isPlaying && (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              aria-label="Stop audio"
              title="Stop audio"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          )}

          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-medium text-xs text-foreground">
              <Volume2 className={`h-3.5 w-3.5 text-garden ${isPlaying && !isPaused ? "animate-pulse" : ""}`} />
              <span>{isPlaying ? (isPaused ? "Paused" : "Listening...") : "Listen to Note"}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isPlaying ? `${progress}% completed` : "Audio narration"}
            </span>
          </div>
        </div>

        {/* Speed toggle */}
        <button
          type="button"
          onClick={toggleSpeed}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:border-garden/40 hover:text-garden"
          title="Change playback speed"
        >
          <Gauge className="h-3 w-3" />
          <span>{SPEEDS[speedIndex]}x</span>
        </button>
      </div>

      {/* Progress Bar */}
      {isPlaying && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full bg-garden transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
