"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";

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

  // Natural text cleaner — removes markdown symbols, code blocks, raw URLs for human-like flow
  const cleanMarkdown = (raw: string): string => {
    return raw
      .replace(/---[\s\S]*?---/, "") // Strip frontmatter
      .replace(/```[\s\S]*?```/g, "") // Strip code blocks
      .replace(/#+\s+/g, "") // Strip heading hashes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Markdown links -> link text
      .replace(/https?:\/\/\S+/g, "") // Strip raw URLs
      .replace(/!\[\[[^\]]+\]\]|\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1") // Wikilinks
      .replace(/`([^`]+)`/g, "$1") // Inline code
      .replace(/[*_~=]/g, "") // Formatting characters
      .replace(/<[^>]+>/g, "") // HTML tags
      .replace(/[-*]\s+/g, ". ") // List items -> pauses
      .replace(/\s+/g, " ") // Extra spaces
      .trim();
  };

  // Select the highest quality natural human voice available
  const getBestVoice = (synth: SpeechSynthesis): SpeechSynthesisVoice | null => {
    const voices = synth.getVoices();
    if (!voices.length) return null;

    // Prioritize natural / neural / premium English voices
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Neural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Alex") ||
          v.name.includes("Karen") ||
          v.name.includes("Daniel"))
    );

    if (naturalVoice) return naturalVoice;

    // Fallback to any English voice
    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  const startPlayback = (plainText: string, rate: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voice = getBestVoice(synth);
    if (voice) utterance.voice = voice;

    utterance.onboundary = (event) => {
      if (event.name === "word" && plainText.length > 0) {
        const pct = Math.min(100, Math.round((event.charIndex / plainText.length) * 100));
        setProgress(pct);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePlayPause = () => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;

    if (isPlaying && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    if (isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    const plainText = `${title}. ${cleanMarkdown(text)}`;
    cleanTextRef.current = plainText;
    startPlayback(plainText, SPEEDS[speedIndex]);
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

    if (isPlaying) {
      startPlayback(cleanTextRef.current, newSpeed);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="inline-flex items-center gap-1">
      {/* Compact Play / Pause Button */}
      <button
        type="button"
        onClick={handlePlayPause}
        className={`inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-all ${
          isPlaying
            ? "border-garden/50 bg-garden/10 text-garden"
            : "bg-surface/50 text-muted-foreground hover:border-garden/40 hover:text-foreground"
        }`}
        title={isPlaying && !isPaused ? "Pause narration" : "Listen to note"}
        aria-label="Listen to note narration"
      >
        {isPlaying && !isPaused ? (
          <Pause className="h-3.5 w-3.5 text-garden fill-garden" />
        ) : (
          <Play className="h-3.5 w-3.5 text-garden fill-garden" />
        )}
        <span>
          {isPlaying
            ? isPaused
              ? "Paused"
              : `${progress}%`
            : "Listen"}
        </span>
      </button>

      {/* Stop button when active */}
      {isPlaying && (
        <button
          type="button"
          onClick={handleStop}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/50 text-muted-foreground hover:border-red-500/40 hover:text-red-400"
          title="Stop audio"
          aria-label="Stop audio"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>
      )}

      {/* Compact Speed Toggle when playing */}
      {isPlaying && (
        <button
          type="button"
          onClick={toggleSpeed}
          className="inline-flex items-center rounded-md border border-border/60 bg-background/50 px-1.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground hover:border-garden/40 hover:text-garden"
          title="Playback speed"
        >
          {SPEEDS[speedIndex]}x
        </button>
      )}
    </div>
  );
}
