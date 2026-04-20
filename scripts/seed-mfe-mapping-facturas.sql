-- Seed / upsert default mapping with the Facturas module (ID "3")
-- This merges into existing mapping (keeps other module IDs).

CREATE TABLE IF NOT EXISTS mfe_mapping_store (
  key text PRIMARY KEY,
  mapping jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mfe_mapping_store (key, mapping)
VALUES (
  'default',
  $$
  {
    "3": {
      "remoteName": "facturas",
      "basePath": "/facturas",
      "screens": [
        { "path": "/facturas/documentos-garantias" },
        { "path": "/facturas/cargue-tasas" },
        { "path": "/facturas/control-cupo" },
        { "path": "/facturas/reportes" },
        { "path": "/facturas/autorizacion-inversiones" },
        { "path": "/facturas/parametrizar-dias-festivos" },
        { "path": "/facturas/historico-reportes-operaciones" },
        { "path": "/facturas/autorizaciones-comercial" },
        { "path": "/facturas/autorizaciones-riesgos" },
        { "path": "/facturas/parametrizacion" },
        { "path": "/facturas/tipo-referenciador" },
        { "path": "/facturas/tipos-empresa" },
        { "path": "/facturas/tamano-empresa" },
        { "path": "/facturas/reportes-operaciones" },
        { "path": "/facturas/reportes-referenciador" },
        { "path": "/facturas/parametrizar-tipos-dce" },
        { "path": "/facturas/compras" }
      ]
    }
  }
  $$::jsonb
)
ON CONFLICT (key)
DO UPDATE SET
  mapping = mfe_mapping_store.mapping || EXCLUDED.mapping,
  updated_at = now();
