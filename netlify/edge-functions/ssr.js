import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración de Firebase
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

// Función para notificar a Facebook que actualice su caché
async function refreshFacebookCache(urlToScrape) {
    // Netlify hace que las variables de entorno estén disponibles aquí
    const accessToken = Netlify.env.get("FACEBOOK_ACCESS_TOKEN");

    if (!accessToken) {
        console.log("[SSR] No se encontró FACEBOOK_ACCESS_TOKEN en las variables de entorno. No se puede refrescar el caché.");
        return;
    }

    console.log(`[SSR] Intentando refrescar el caché de Facebook para: ${urlToScrape}`);
    
    try {
        const response = await fetch('https://graph.facebook.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `id=${encodeURIComponent(urlToScrape)}&scrape=true&access_token=${accessToken}`
        });

        const result = await response.json();
        if (response.ok) {
            console.log("[SSR] Notificación de actualización de caché enviada a Facebook con éxito.", result);
        } else {
            console.error("[SSR] Error al notificar a Facebook:", result);
        }
    } catch (error) {
        console.error("[SSR] Error de red al intentar contactar a Facebook:", error);
    }
}


export default async (request, context) => {
    try {
        const url = new URL(request.url);
        const newsId = url.searchParams.get('id');
        const userAgent = request.headers.get("user-agent") || "";
        const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

        if (!newsId || !isBot) {
            return await context.next();
        }

        const docRef = doc(db, "noticias", newsId);
        const docSnap = await getDoc(docRef);

        let pageResponse = await context.next();
        let page = await pageResponse.text();

        if (docSnap.exists()) {
            const news = docSnap.data();
            const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160).replace(/"/g, '&quot;');
            const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';
            const newsTitle = news.title.replace(/"/g, '&quot;');
            
            page = page
                .replace(/<title>.*?<\/title>/, `<title>${newsTitle} | Diócesis de Santo Tomé</title>`)
                .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${newsTitle}">`)
                .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`)
                .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imageUrl}">`)
                .replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${url.href}">`);
            
            // Llama a la función para refrescar el caché de Facebook después de preparar la página
            // Usamos context.waitUntil para que la notificación no retrase la respuesta al bot
            context.waitUntil(refreshFacebookCache(url.href));
        }

        return new Response(page, pageResponse);

    } catch (error) {
        console.error("[SSR] ERROR CRÍTICO en la Edge Function:", error);
        return context.next(); // En caso de error, devolvemos la página original
    }
};
