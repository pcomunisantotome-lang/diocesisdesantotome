// Importaciones de Firebase
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async (request, context) => {
    try {
        const response = await context.next();
        let page = await response.text();
        
        const url = new URL(request.url);
        const newsId = url.searchParams.get('id');
        const userAgent = request.headers.get("user-agent") || "";
        const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

        if (!newsId || !isBot) {
            return new Response(page, response);
        }

        const docRef = doc(db, "noticias", newsId);
        const docSnap = await getDoc(docRef);

        const metaBlockRegex = /<!-- METATAGS-START -->[\s\S]*?<!-- METATAGS-END -->/;
        let metaTags = '';

        if (docSnap.exists()) {
            const news = docSnap.data();
            const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160).replace(/"/g, '&quot;');
            const title = (news.title || 'Noticia').replace(/"/g, '&quot;');
            const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';
            const fullUrl = url.href;

            metaTags = `
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:url" content="${fullUrl}">
                <meta property="og:type" content="article">
                <meta property="fb:app_id" content="1497738074977879" />
            `;
            page = page.replace(/<title>.*?<\/title>/, `<title>${title} | Diócesis de Santo Tomé</title>`);
        }

        page = page.replace(metaBlockRegex, metaTags);
        return new Response(page, response);

    } catch (error) {
        console.error("Error en la Edge Function:", error);
        return context.next();
    }
};

