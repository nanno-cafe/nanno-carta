# Nanno Café · Pedí y pasá

Nueva app de carta y pedidos para retirar. Todo este proyecto vive en **APP-2** y usa un **Supabase nuevo**, separado de la app de fidelidad.

## Qué incluye

- Carta adaptable a celular y computadora, categorías, buscador y detalle de producto.
- Carrito con cantidades y aclaraciones por producto. Se conserva en este navegador.
- Antes de preparar el mensaje, vuelve a comprobar precios y disponibilidad.
- Botón para abrir WhatsApp con nombre, productos, cantidades, total estimado y retiro deseado. El cliente debe enviar el mensaje; el local confirma disponibilidad, horario y pago.
- Panel en `/admin.html`: categorías, productos, fotos, precios, orden, visibilidad, agotados y destacados.
- Clásico, Halloween con murciélagos y Navidad con nieve. El administrador puede apagar animaciones; también se respeta la preferencia de movimiento reducido del dispositivo.
- WhatsApp, dirección, horarios, bienvenida y pausa de pedidos configurables.

Esta primera versión no cobra por Internet ni registra pedidos en Supabase: el pedido se conversa en WhatsApp. Abrir el enlace no demuestra que el cliente lo haya enviado. No descuenta stock ni suma cafés en fidelidad. No hay entrega a domicilio ni extras con recargo; las aclaraciones son texto y el local confirma su viabilidad. Si más adelante necesitamos estados, números de pedido y pagos, eso requiere un circuito de pedidos persistidos y validación de precios en servidor.

## 1. Revisar el diseño localmente

Instalá Node.js 22 o superior. Desde una terminal dentro de APP-2:

```powershell
npm ci
npm run dev
```

Abrí la dirección que muestre la terminal, agregando `/?demo=1` (normalmente `http://127.0.0.1:5173/?demo=1`). La barra superior permite probar los tres diseños. Los productos y precios son ejemplos; los pedidos están bloqueados en esa vista. No se cargan ejemplos en la base. Las fotos de ejemplo provienen de las imágenes Unsplash del diseño de referencia. Las fotos reales se suben desde el panel.

La ruta normal `/` muestra el catálogo real o un mensaje de preparación si todavía no está conectado. El HTML original `cafeter_a_gourmet_men_digital.html` se conserva como referencia y no se incluye en la compilación.

## 2. Crear el Supabase nuevo

1. En Supabase, creá un proyecto nuevo para la carta. Guardá la contraseña de la base en tu gestor; no va en el código.
2. En **SQL Editor**, pegá el contenido completo de `supabase/01_instalar.sql` y ejecutalo. Crea tablas, permisos y el espacio para imágenes. Se puede volver a ejecutar conservando datos.
3. En **Authentication → Users → Add user**, creá tu usuario administrador con email y contraseña. Confirmá el email desde esa opción si está disponible.
4. Abrí `supabase/02_admin.sql`, reemplazá `REEMPLAZAR_POR_TU_EMAIL` por ese email y ejecutalo. Crear un usuario por sí solo NO da acceso al panel.
5. Copiá `.env.example` como `.env.local`. Completá la URL y la clave **publishable** del proyecto nuevo:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE
```

No usar `service_role`, claves `secret`, contraseñas ni las credenciales del proyecto de fidelidad. La clave publishable se incluye en el navegador por diseño; los permisos reales los controlan las políticas de Supabase.

6. Reiniciá `npm run dev`. Abrí `/admin.html`, ingresá y creá categorías y productos.
7. En **Diseño y local**, completá WhatsApp internacional sin signos (ej.: `5491123456789`), dirección, horarios y activá **Recibir pedidos por WhatsApp**. El teléfono del HTML de referencia NO se reutilizó: el número real debe confirmarlo el dueño.

El panel no permite crear administradores ni borrar productos físicamente: para retirarlos de la carta, desactivá **Visible**. Las imágenes reemplazadas se conservan en Storage; se pueden limpiar allí más adelante cuando ya no se utilicen.

## 3. Subir a GitHub

Creá un repositorio nuevo para la carta, por ejemplo `nanno-carta`. No reemplaces el repositorio de fidelidad.

Para subir desde el navegador de GitHub, podés ejecutar:

```powershell
python tools/package.py
```

Descomprimí `nanno-carta-github.zip` y subí **su contenido** a la raíz del repositorio con **Add file → Upload files → Commit changes**. El paquete excluye `.env.local`, `node_modules`, compilados, pruebas y el diseño original de referencia. Incluye los archivos necesarios y una copia de `.env.example` sin credenciales.

También podés trabajar con Git desde APP-2 usando el `.gitignore` incluido. No subas clientes, CSV, contraseñas ni `node_modules`.

## 4. Conectar Vercel

1. En Vercel elegí **Add New → Project** y conectá el repositorio nuevo.
2. Framework: **Vite**. Si subiste el contenido de APP-2 a la raíz, dejá **Root Directory** en la raíz. Si subiste el repositorio completo, elegí **APP-2**.
3. Agregá en **Environment Variables** las dos variables del paso 2 con la URL y clave publishable del proyecto nuevo. Para empezar alcanza el entorno **Production**; los previews públicos también mostrarían ese catálogo si les configurás las mismas variables.
4. Build Command: `npm run build`. Output Directory: `dist`. Node.js: **22.x** o superior.
5. Tocá **Deploy**. Vercel asigna una dirección `nombre.vercel.app`.
6. Abrí `/admin.html`, iniciá sesión y verificá el catálogo. Si cambiás variables en Vercel, hacé **Redeploy** para incorporarlas al código compilado.

Un dominio propio como `nannocafe.app` se registra aparte. Cuando lo tengas, agregalo en **Settings → Domains** y seguí los registros DNS que indique Vercel. El subdominio `*.vercel.app` ya permite usar la app sin comprar dominio.

## Prueba antes de compartir

Con el WhatsApp real configurado, creá un producto, agregalo al carrito, completá el nombre y continuá. Comprobá que el botón abre el número correcto y muestra cantidades, precios y dirección. Enviar ese mensaje de prueba es una acción manual del dueño. Probá además pausar pedidos y marcar un producto agotado. Ocultá los productos de prueba cuando termines.

## Verificación técnica

```powershell
npm test
npm run build
```

Pruebas adicionales, con paquetes locales de Playwright/Edge y PGlite:

```powershell
node tests/browser.mjs RUTA_AL_PAQUETE_PLAYWRIGHT
node tests/database.mjs RUTA_AL_PAQUETE_PGLITE
```

Las pruebas usan datos ficticios y no modifican proyectos reales. Las de base validan permisos en PostgreSQL local con esquemas mínimos de Auth/Storage; la carga real de archivos debe comprobarse al conectar Supabase.

Referencias oficiales: [Supabase Storage y permisos](https://supabase.com/docs/guides/storage/security/access-control), [Vercel y repositorios](https://vercel.com/docs/deployments/overview), [dominios de Vercel](https://vercel.com/docs/domains/working-with-domains), [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934).
