import React, { useState } from 'react';
import {
  Database,
  Upload,
  FileText,
  CheckCircle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { cultures } from '../../data/cultures';

export const DataImportTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [targetCulture, setTargetCulture] = useState<string>('custom');
  const [targetCategory, setTargetCategory] = useState<string>('character');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stageStatus, setStageStatus] = useState<string | null>(null);

  const handleSimulateSelect = (filename: string) => {
    setSelectedFile(filename);
    setStageStatus(`Staged "${filename}" for pipeline parsing.`);
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Notice Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-gold-500/15 via-gold-500/5 to-transparent border border-gold-500/30 flex items-start gap-3">
        <Database className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Seed Database & Corpus Ingestion Hub</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/40">
              Pipeline Ready
            </span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ingest custom anthroponymic and toponymic datasets into Nomata. You will be able to supply
            raw text corpora, CSV wordlists, or JSON lexicons to augment the Markov chain models and
            recursive grammar engines.
          </p>
        </div>
      </div>

      {/* File Dropzone */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
          Ingest Seed Corpus File
        </label>
        <div
          data-testid="seed-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              handleSimulateSelect(files[0].name);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-gold-400 bg-gold-500/10'
              : 'border-charcoal-700 bg-charcoal-850 hover:border-gold-500/40 hover:bg-charcoal-800/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mx-auto mb-3 shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)]">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-200 mb-1">
            Drag & drop dataset or click to browse
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Supports JSON (`.json`), Comma-Separated Values (`.csv`), or plain text wordlists (`.txt`)
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              data-testid="simulate-upload-json"
              onClick={() => handleSimulateSelect('slavic_chronicles_names.json')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-charcoal-900 border border-charcoal-700 text-slate-300 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 inline mr-1 text-gold-400" />
              Load Sample JSON
            </button>
            <button
              type="button"
              data-testid="simulate-upload-csv"
              onClick={() => handleSimulateSelect('celtic_highland_toponyms.csv')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-charcoal-900 border border-charcoal-700 text-slate-300 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 inline mr-1 text-gold-400" />
              Load Sample CSV
            </button>
          </div>

          {selectedFile && (
            <div
              data-testid="staged-file-indicator"
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-medium"
            >
              <CheckCircle className="w-4 h-4 text-gold-400" />
              <span>Staged: {selectedFile}</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-1.5">
          <label className="text-xs font-medium text-slate-300 block">
            Target Cultural Tradition
          </label>
          <select
            data-testid="select-target-culture"
            value={targetCulture}
            onChange={(e) => setTargetCulture(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-charcoal-900 border border-charcoal-700 rounded-lg text-slate-200 outline-none focus:border-gold-500/50"
          >
            <option value="custom">New Custom Culture / Tradition</option>
            <option value="danubian_slavic">Danubian Slavic</option>
            <option value="celtic_gaelic">Celtic Gaelic</option>
            <option value="nordic_scandian">Nordic Scandian</option>
            <option value="greco_aegean">Greco Aegean</option>
            <option value="levantine_semitic">Levantine Semitic</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Assign the imported seeds to augment an existing tradition or seed a new one.
          </p>
        </div>

        <div className="bg-charcoal-850 p-3.5 rounded-lg border border-charcoal-750 space-y-1.5">
          <label className="text-xs font-medium text-slate-300 block">
            Target Domain Category
          </label>
          <select
            data-testid="select-target-category"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-charcoal-900 border border-charcoal-700 rounded-lg text-slate-200 outline-none focus:border-gold-500/50"
          >
            <option value="character">People & Characters (Given names, surnames)</option>
            <option value="settlement">Settlements & Strongholds (Towns, wards, castles)</option>
            <option value="geography">Geography & Landmarks (Mountains, rivers, wilds)</option>
            <option value="faction">Factions, Guilds & Orders</option>
            <option value="artifact">Artifacts, Relics & Weapons</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Specify where the incoming vocabulary will be utilized in the generator.
          </p>
        </div>
      </div>

      {/* Installed Base Corpora Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gold-400" />
            <span>Installed Baseline Historical Corpora</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">5 Active Cultures (~800 seeds)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Object.values(cultures).map((culture) => (
            <div
              key={culture.id}
              className="p-3 rounded-lg bg-charcoal-850 border border-charcoal-750 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-medium text-slate-200">{culture.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{culture.historical_era}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {stageStatus && (
        <div className="p-3 rounded-lg bg-charcoal-850 border border-gold-500/30 text-xs text-gold-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-gold-400 shrink-0" />
          <span>{stageStatus}</span>
        </div>
      )}
    </div>
  );
};
