// Importante: Este archivo debe estar en la carpeta principal de tu proyecto.

export async function onRequest(context) {
    // Obtenemos la página original que el visitante iba a recibir
    const response = await context.next();

    // Extraemos la información de la URL y del visitante
    const url = new URL(context.request.url);
    const userAgent = context.request.headers.get("user-agent") || "";
    const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|googlebot|bingbot/i.test(userAgent);

    // Solo continuamos si estamos en la página de noticia y el visitante es un bot
    if (url.pathname.endsWith('/noticia.html') && isBot) {
        const newsId = url.searchParams.get('id');
        if (!newsId) {
            return response; // No hay ID, devolvemos la página original
        }

        try {
            // ----- Obtenemos los datos de la noticia desde Firebase -----
            const projectId = 'diocesisdesantotome'; // ID del proyecto ya insertado
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/noticias/${newsId}`;

            const firestoreResponse = await fetch(firestoreUrl);
            if (!firestoreResponse.ok) {
                 console.error("Error al buscar en Firebase:", firestoreResponse.statusText);
                 return response; // Si hay un error, devolvemos la página original
            }

            const firestoreData = await firestoreResponse.json();
            const news = {
                title: firestoreData.fields.title.stringValue,
                summary: firestoreData.fields.summary.stringValue,
                featuredImageUrl: firestoreData.fields.featuredImageUrl.stringValue
            };

            // Leemos el contenido de la página noticia.html
            let page = await response.text();

            const description = (news.summary || '').replace(/<[^>]+>/g, '').substring(0, 160);
            const imageUrl = news.featuredImageUrl || 'https://firebasestorage.googleapis.com/v0/b/diocesisdesantotome.firebasestorage.app/o/LOGOS%2Flogo%20iglesia%20samaritana.png?alt=media&token=56fd32c1-bb7d-4537-83f7-ace6662ff768';
            const fullUrl = url.href;

            // Construimos el bloque completo de metadatos
            const metaTags = `
                <meta property="og:title" content="${news.title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:url" content="${fullUrl}">
                <meta property="og:type" content="article">
                <meta property="fb:app_id" content="1497738074977879" />
            `;

            page = page.replace(/<title>.*?<\/title>/, `<title>${news.title} | Diócesis de Santo Tomé</title>`);
            // Reemplazamos el bloque de metadatos en el HTML
            page = page.replace(/<!-- METATAGS-START -->[\s\S]*?<!-- METATAGS-END -->/, metaTags);

            // Devolvemos la página ya modificada para el bot
            return new Response(page, {
                headers: { 'Content-Type': 'text/html' }
            });

        } catch (error) {
            console.error("Error en la Cloudflare Function:", error);
            return response; // En caso de cualquier error, siempre devolvemos la página original
        }
    }

    // Si no es un bot o no es la página de noticia, simplemente devolvemos la página original sin cambios.
    return response;
}

