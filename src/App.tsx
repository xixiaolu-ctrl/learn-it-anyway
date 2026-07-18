import { useEffect, useState } from "react";
import defaultWords from "./words.json";
import { ExportIcon, VolumeIcon } from "./icons";
import "./App.css";

type Word = { word: string; pronunciation: string; meaning: string };

const WORDS_KEY = "learnItAnyway.words";
const INDEX_KEY = "learnItAnyway.index";
const ROTATION_KEY = "learnItAnyway.rotation";
const SOUND_KEY = "learnItAnyway.sound";
const ROTATION_MINUTES_KEY = "learnItAnyway.rotationMinutes";
const ROTATION_MINUTE_OPTIONS = [5, 10, 15, 20, 30];

function loadInitialWords(): Word[] {
  try {
    const saved = localStorage.getItem(WORDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore malformed data, fall back to bundled defaults
  }
  return defaultWords;
}

function loadInitialIndex(wordCount: number): number {
  const saved = Number(localStorage.getItem(INDEX_KEY));
  if (Number.isInteger(saved) && saved >= 0 && saved < wordCount) {
    return saved;
  }
  return 0;
}

function loadBoolean(key: string): boolean {
  return localStorage.getItem(key) === "true";
}

function loadRotationMinutes(): number {
  const saved = Number(localStorage.getItem(ROTATION_MINUTES_KEY));
  return ROTATION_MINUTE_OPTIONS.includes(saved) ? saved : 30;
}

function parseImportText(text: string): Word[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(" - ").map((p) => p.trim());
      if (parts.length >= 3) {
        return { word: parts[0], pronunciation: parts[1], meaning: parts[2] };
      }
      return { word: parts[0], pronunciation: "", meaning: parts[1] ?? "" };
    })
    .filter((w) => w.word.length > 0);
}

function App() {
  const [words, setWords] = useState<Word[]>(loadInitialWords);
  const [index, setIndex] = useState(() => loadInitialIndex(words.length));
  const [rotation, setRotation] = useState(() => loadBoolean(ROTATION_KEY));
  const [sound, setSound] = useState(() => loadBoolean(SOUND_KEY));
  const [rotationMinutes, setRotationMinutes] = useState(loadRotationMinutes);
  const [manageOpen, setManageOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const current = words[index];

  useEffect(() => {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    if (words.length > 0 && index >= words.length) {
      setIndex(words.length - 1);
    }
  }, [words, index]);

  useEffect(() => {
    localStorage.setItem(INDEX_KEY, String(index));
  }, [index]);

  useEffect(() => {
    localStorage.setItem(ROTATION_KEY, String(rotation));
  }, [rotation]);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(sound));
  }, [sound]);

  useEffect(() => {
    localStorage.setItem(ROTATION_MINUTES_KEY, String(rotationMinutes));
  }, [rotationMinutes]);

  function goNext() {
    if (words.length === 0) return;
    setIndex((prev) => (prev + 1) % words.length);
  }

  useEffect(() => {
    if (!rotation) return;
    const id = setInterval(goNext, rotationMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [rotation, rotationMinutes]);

  function speak() {
    if (!current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!sound) return;
    speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, sound]);

  function handleImport() {
    const newWords = parseImportText(importText);
    if (newWords.length === 0) return;
    setWords((prev) => [...prev, ...newWords]);
    setImportText("");
  }

  function handleDelete(i: number) {
    setWords((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="page" data-tauri-drag-region>
      <div className="card" data-tauri-drag-region>
        <div className="card-header">
          <button
            className="icon-btn manage-btn"
            onClick={() => setManageOpen((v) => !v)}
            aria-label="Manage words"
          >
            <ExportIcon />
          </button>
          {!manageOpen && current && <h1 className="word">{current.word}</h1>}
        </div>

        {!manageOpen &&
          (current ? (
            <>
              <div className="divider" />
              <div className="pronunciation-row">
                <button className="icon-btn speak-btn" onClick={speak} aria-label="Pronounce word">
                  <VolumeIcon />
                </button>
                <span className="pronunciation">{current.pronunciation}</span>
                <button className="next-btn" onClick={goNext} aria-label="Next word">
                  ›
                </button>
              </div>
              <p className="meaning">{current.meaning}</p>
            </>
          ) : (
            <p className="empty-state">还没有单词,请在下方添加</p>
          ))}

        <div className="settings-bar">
          <label className="toggle">
            <input
              type="checkbox"
              checked={rotation}
              onChange={(e) => setRotation(e.target.checked)}
            />
            <span className="switch" />
            Rotation
          </label>
          <select
            className="interval-select"
            value={rotationMinutes}
            onChange={(e) => setRotationMinutes(Number(e.target.value))}
            aria-label="Rotation interval"
          >
            {ROTATION_MINUTE_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
          <label className="toggle">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
            />
            <span className="switch" />
            Sound
          </label>
        </div>

        {manageOpen && (
          <div className="manage-panel">
            <div className="word-list">
              {words.length === 0 && <p className="word-list-empty">(空)</p>}
              {words.map((w, i) => (
                <div className="word-list-item" key={`${w.word}-${i}`}>
                  <span className="word-list-word">{w.word}</span>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(i)}
                    aria-label={`Delete ${w.word}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <textarea
              className="import-textarea"
              placeholder={"word - pronunciation - meaning\n(one per line)"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="panel-actions">
              <button className="cancel-btn" onClick={() => setManageOpen(false)}>
                Cancel
              </button>
              <button className="add-btn" onClick={handleImport}>
                Add to List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
