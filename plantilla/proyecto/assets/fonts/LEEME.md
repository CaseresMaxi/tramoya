# Fuentes propias del proyecto

Las fuentes las trae el **estilo** elegido (`proyecto/estilo/fuentes/`, copiadas de la
galería con `tramoya estilo <id>`). Esta carpeta es para fuentes que el proyecto sume por
su cuenta (la tipografía institucional, por ejemplo).

Para usar una: copiala acá en `.woff2` y declarala en `proyecto/proyecto.js`, que manda
sobre el estilo:

```js
fuentes: [{ familia: 'Mi Fuente', archivo: 'proyecto/assets/fonts/mi-fuente.woff2', peso: '100 900' }],
tipografia: { display: "'Mi Fuente', serif" },
```

Si es la de la marca, regenerá las curvas del logo con
`python3 herramientas/generar_glifos.py proyecto/assets/fonts/mi-fuente.woff2`.
Anotá la licencia de cada fuente (OFL, comercial…) en este archivo.
