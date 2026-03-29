import { useState } from 'react';
import { X, Eye, Moon } from 'lucide-react';
import { useColourBlind, type ColourBlindMode } from '../context/ColourBlindContext';

interface SettingsModalProps {
  onClose: () => void;
}

const MODES: { value: ColourBlindMode; label: string; description: string }[] = [
  { value: 'normal',       label: 'Normal',       description: 'Default colour scheme' },
  { value: 'deuteranopia', label: 'Deuteranopia',  description: 'Red-green (most common)' },
  { value: 'protanopia',   label: 'Protanopia',    description: 'Red-green (reduced red)' },
  { value: 'tritanopia',   label: 'Tritanopia',    description: 'Blue-yellow' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { mode, setMode } = useColourBlind();
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('tradeup_dark_mode', String(next));
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">Colour Blind Mode</h3>
        </div>

        <div className="space-y-2">
          {MODES.map(({ value, label, description }) => (
            <label
              key={value}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                mode === value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="colourBlindMode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="accent-purple-600"
              />
              <div>
                <p className="font-medium text-gray-800 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-5" />

        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-semibold text-gray-800">Dark Mode</p>
              <p className="text-xs text-gray-500">Use a darker colour scheme</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={darkMode}
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              darkMode ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
