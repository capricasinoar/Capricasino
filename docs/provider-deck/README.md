# CAPRI CASINO — Provider Partnership Deck

Documento comercial B2B para presentar la plataforma a agregadores de juegos
(Hub88, SoftSwiss, EveryMatrix, Relax, Pariplay, St8, etc.) y conseguir una
integración por API. **Redactado en inglés** (el idioma de este sector).

## Archivos

| Archivo | Qué es |
|---|---|
| `capri-provider-deck.html` | El documento premium, responsive y auto-contenido. Es la fuente para el PDF. |
| `capri-provider-deck.md` | Misma información en Markdown — editable, para copiar/pegar o versionar. |
| Artifact online | Versión publicada (link privado) para verlo y compartir. |

## Cómo exportar a PDF (calidad profesional)

1. Abre `capri-provider-deck.html` en Chrome (doble clic), o abre el link del Artifact.
2. **Cmd/Ctrl + P** → destino **"Guardar como PDF"**.
3. En "Más ajustes": activa **"Gráficos de fondo"** (para que el fondo oscuro y el verde salgan en el PDF).
4. Márgenes: **Ninguno**. Tamaño: **A4**. Guardar.

Cada sección salta a una página nueva → ~13–14 páginas limpias.

## Antes de enviarlo — completa los placeholders

Todos los datos pendientes están marcados en verde con borde punteado (`[así]`).
Búscalos y reemplázalos:

- **Prepared for** → el nombre del proveedor al que se lo envías (personaliza cada envío).
- **Company** → nombre legal de tu empresa / entidad.
- **Website** → tu dominio.
- **Email / Telegram / WhatsApp / LinkedIn** → tus contactos comerciales.
- **Licensing status & jurisdiction** → estado real de tu licencia (ver nota abajo).
- **Commercial terms** → se dejan a negociar a propósito (no afirmar cifras).
- **Hosting / CDN** → tu infraestructura real cuando la definas.

## Notas de honestidad (importante)

El documento es deliberadamente **honesto y defendible** — un proveedor hace due
diligence técnica y verá cualquier exageración:

- **Nada inventado:** sin usuarios, ingresos, estadísticas, licencias ni acuerdos falsos.
- **Lo técnico es real:** wallet de doble entrada, protocolo seamless-wallet (launch/
  debit/credit/rollback, HMAC, idempotencia) — todo está construido y probado.
- **Infra descrita con precisión:** "containerizado y portable a AWS/GCP", no "corremos
  en AWS"; "núcleo modular escalable", no "microservicios en producción".
- **Referral y anti-fraude** figuran como "en roadmap / base lista", no como terminados.
- **Licencia:** casi todos los agregadores **exigen que el operador tenga licencia de
  juego** antes de dar acceso a su API. El documento deja la licencia como placeholder;
  tenlo presente en la conversación con ellos.
