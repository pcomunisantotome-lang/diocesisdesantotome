import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración de Firebase (debe coincidir con la de tu sitio)
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

// Esta es la función que se ejecutará en el servidor de Netlify
export default async (request, context) => {
    // Obtenemos la URL original que el usuario o el bot está pidiendo
    const url = new URL(request.url);
    const newsId = url.searchParams.get('id');

    // Buscamos el archivo noticia.html para usarlo como plantilla
    const response = await context.next();
    const page = await response.text();

    // Si no es una noticia específica, no hacemos nada
    if (!newsId) {
        return new Response(page, response);
    }

    try {
        // 1. Ir a la base de datos y buscar la información de la noticia
        const docRef = doc(db, "noticias", newsId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return new Response(page, response); // La noticia no existe, devolvemos la página normal
        }

        const news = docSnap.data();

        // 2. Reemplazar los metadatos genéricos con los de la noticia
        const updatedPage = page
            .replace(/<title>.*<\/title>/, `<title>${news.title} | Diócesis de Santo Tomé</title>`)
            .replace(/<meta property="og:title" content=".*">/, `<meta property="og:title" content="${news.title}">`)
            .replace(/<meta property="og:description" content=".*">/, `<meta property="og:description" content="${(news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160)}">`)
            .replace(/<meta property="og:image" content=".*">/, `<meta property="og:image" content="${news.featuredImageUrl || ''}">`)
            .replace(/<meta property="og:url" content=".*">/, `<meta property="og:url" content="${url.href}">`);

        // 3. Devolver la página ya "rellenada" al robot de Facebook
        return new Response(updatedPage, response);

    } catch (error) {
        console.error("Error en la función del servidor:", error);
        // Si algo falla, simplemente devolvemos la página original
        return new Response(page, response);
    }
};
