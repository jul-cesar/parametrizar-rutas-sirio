'use client';

import { useEffect, useState } from 'react';

interface ScreenMapping {
  path: string;
  mfePath?: string;
}

interface ModuleMapping {
  remoteName: string;
  basePath: string;
  screens: ScreenMapping[];
}

type MfeMapping = Record<string, ModuleMapping>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScreenMapping(value: unknown): value is ScreenMapping {
  return (
    isPlainObject(value) &&
    typeof value.path === 'string' &&
    (value.mfePath === undefined || typeof value.mfePath === 'string')
  );
}

function isModuleMapping(value: unknown): value is ModuleMapping {
  return (
    isPlainObject(value) &&
    typeof value.remoteName === 'string' &&
    typeof value.basePath === 'string' &&
    Array.isArray(value.screens) &&
    value.screens.every(isScreenMapping)
  );
}

function isMfeMapping(value: unknown): value is MfeMapping {
  return isPlainObject(value) && Object.values(value).every(isModuleMapping);
}

export default function Home() {
  const [mapping, setMapping] = useState<MfeMapping>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMapping();
  }, []);

  async function fetchMapping() {
    try {
      const res = await fetch('/api/mfe-mapping');
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const serverMsg =
          isPlainObject(data) && typeof data.error === 'string'
            ? data.error
            : `Error cargando mapping (${res.status})`;
        setMessage(serverMsg);
        return;
      }

      if (!isMfeMapping(data)) {
        setMessage('Mapping inválido recibido del servidor');
        return;
      }

      setMapping(data);
    } catch {
      setMessage('Error cargando mapping');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/mfe-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });

      if (res.ok) {
        setMessage('Guardado exitosamente');
        return;
      }

      const data: unknown = await res.json().catch(() => null);
      const serverMsg =
        isPlainObject(data) && typeof data.error === 'string'
          ? data.error
          : `Error guardando (${res.status})`;
      setMessage(serverMsg);
    } catch {
      setMessage('Error guardando');
    } finally {
      setSaving(false);
    }
  }

  function addModule() {
    const newKey = String(Math.max(...Object.keys(mapping).map(Number), 0) + 1);
    setMapping({
      ...mapping,
      [newKey]: { remoteName: '', basePath: '', screens: [] },
    });
  }

  function removeModule(key: string) {
    const { [key]: _, ...rest } = mapping;
    setMapping(rest);
  }

  function updateModule(key: string, field: keyof ModuleMapping, value: string) {
    setMapping({
      ...mapping,
      [key]: { ...mapping[key], [field]: value },
    });
  }

  function addScreen(key: string) {
    setMapping({
      ...mapping,
      [key]: {
        ...mapping[key],
        screens: [...mapping[key].screens, { path: '' }],
      },
    });
  }

  function removeScreen(key: string, index: number) {
    setMapping({
      ...mapping,
      [key]: {
        ...mapping[key],
        screens: mapping[key].screens.filter((_, i) => i !== index),
      },
    });
  }

  function updateScreen(key: string, index: number, field: keyof ScreenMapping, value: string) {
    setMapping({
      ...mapping,
      [key]: {
        ...mapping[key],
        screens: mapping[key].screens.map((s, i) =>
          i === index ? { ...s, [field]: value } : s
        ),
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-zinc-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Parametrizar Rutas MFE
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Administra el mapeo de rutas de microfrontends
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addModule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + Agregar Módulo
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {Object.entries(mapping).map(([key, module]) => (
          <div key={key} className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Módulo {module.remoteName || key}
              </h2>
              <button
                onClick={() => removeModule(key)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
              >
                Eliminar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Remote Name
                </label>
                <input
                  type="text"
                  value={module.remoteName}
                  onChange={(e) => updateModule(key, 'remoteName', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="AlianzaSirioFeFacturas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Base Path
                </label>
                <input
                  type="text"
                  value={module.basePath}
                  onChange={(e) => updateModule(key, 'basePath', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  placeholder="/facturas"
                />
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Pantallas ({module.screens.length})
                </h3>
                <button
                  onClick={() => addScreen(key)}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                >
                  + Pantalla
                </button>
              </div>

              {module.screens.length === 0 && (
                <p className="text-sm text-zinc-400 italic">Sin pantallas configuradas</p>
              )}

              {module.screens.map((screen, index) => (
                <div key={index} className="flex items-center gap-3 mb-2">
                  <input
                    type="text"
                    value={screen.path}
                    onChange={(e) => updateScreen(key, index, 'path', e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="/facturas/documentos-garantias"
                  />
                  <button
                    onClick={() => removeScreen(key, index)}
                    className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(mapping).length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-lg">No hay módulos configurados</p>
            <p className="text-sm mt-1">Haz click en &quot;Agregar Módulo&quot; para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}