import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración de Firebase (debe coincidir con la de tu sitio)
const firebaseConfig = {
    apiKey: "AIzaSyCIC457rky1NFQCas3uWFfIDVRBHfdbEAQ",
    authDomain: "diocesisdesantotome.firebaseapp.com",
    projectId: "diocesisdesantotome",
    storageBucket: "diocesisdesantotome.firebasestorage.app",
    messagingSenderId: "313851932898",
    appId: "1:313851932898:web:0b7e65d0da8d09d762aebb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Esta función se ejecutará en el servidor de Netlify
export default async (request, context) => {
    try {
        const url = new URL(request.url);
        const newsId = url.searchParams.get('id');
        const userAgent = request.headers.get("user-agent") || "";
        const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

        console.log(`[SSR] Solicitud para: ${url.pathname}${url.search}`);
        console.log(`[SSR] User-Agent: ${userAgent}`);

        if (!newsId || !isBot) {
            console.log(`[SSR] No es un bot o no hay ID de noticia. Sirviendo página original.`);
            return await context.next();
        }

        console.log(`[SSR] Bot detectado. ID de Noticia: ${newsId}. Buscando en Firebase...`);

        const docRef = doc(db, "noticias", newsId);
        const docSnap = await getDoc(docRef);

        let pageResponse = await context.next();
        let page = await pageResponse.text();

        if (docSnap.exists()) {
            const news = docSnap.data();
            console.log(`[SSR] Datos de Firebase encontrados para "${news.title}"`);
            const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160).replace(/"/g, '&quot;');
            const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';
            const newsTitle = news.title.replace(/"/g, '&quot;');
            
            console.log(`[SSR] Inyectando metadatos:`);
            console.log(`[SSR]  - Título: ${newsTitle}`);
            console.log(`[SSR]  - Descripción: ${description}`);
            console.log(`[SSR]  - Imagen: ${imageUrl}`);

            page = page
                .replace(/<title>.*?<\/title>/, `<title>${newsTitle} | Diócesis de Santo Tomé</title>`)
                .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${newsTitle}">`)
                .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`)
                .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imageUrl}">`)
                .replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${url.href}">`);

            console.log(`[SSR] HTML modificado con éxito. Sirviendo página al bot.`);
        } else {
            console.log(`[SSR] Documento de Firebase con ID "${newsId}" NO encontrado.`);
        }

        return new Response(page, pageResponse);

    } catch (error) {
        console.error("[SSR] ERROR CRÍTICO en la Edge Function:", error);
        return context.next(); // En caso de error, devolvemos la página original
    }
};
