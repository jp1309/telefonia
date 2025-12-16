# 📱 Dashboard de Telefonía Móvil - Ecuador

Este proyecto es un dashboard interactivo que visualiza la evolución de las líneas activas de telefonía móvil en Ecuador, clasificadas por empresa (CONECEL, OTECEL, CNT) y por modalidad (Prepago/Pospago) o servicio.

**🔗 [Ver Dashboard en Vivo](https://jp1309.github.io/telefonia/)**

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success) ![Auto-Update](https://img.shields.io/badge/Updates-Monthly-blue)

## ✨ Características

*   **Visualización Interactiva:** Gráficos dinámicos de líneas y barras.
*   **Filtros:** Exploración por compañía y tipo de servicio.
*   **KPIs:** Indicadores de variación mensual y anual.
*   **Datos Oficiales:** Fuente de datos automatizada desde la página de ARCOTEL.
*   **Actualización Automática:** Sistema ETL integrado con GitHub Actions que actualiza los datos el día 20 de cada mes.

## 🚀 Cómo funciona

El sistema consta de tres partes principales:

1.  **Descarga (`descargar_data.py`):** Un script que visita la web de ARCOTEL y descarga los últimos reportes Excel disponibles.
2.  **Procesamiento (`etl_unified.py`):** Limpia, normaliza y transforma los archivos Excel en archivos CSV optimizados para la web.
3.  **Visualización (`index.html` + `app.js`):** Una interfaz web estática que lee los CSV y muestra los datos usando Chart.js.

## 🛠️ Instalación y Uso Local

Si deseas correr este proyecto en tu propia máquina:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/jp1309/telefonia.git
    cd telefonia
    ```

2.  **Instalar dependencias (Python 3.9+):**
    ```bash
    pip install pandas openpyxl requests beautifulsoup4
    ```

3.  **Iniciar Servidor Local:**
    Para ver el dashboard, necesitas un servidor web simple debido a las políticas de seguridad de los navegadores (CORS).
    ```bash
    python -m http.server 8080
    ```
    Abre tu navegador en: `http://localhost:8080`

4.  **Actualizar Datos Manualmente:**
    Para descargar y procesar los datos más recientes al instante:
    ```bash
    python update_pipeline.py
    ```

## 🤖 Automatización (GitHub Actions)

Este repositorio incluye un flujo de trabajo (`.github/workflows/monthly_update.yml`) configurado para:
*   Ejecutarse automáticamente el **día 20 de cada mes**.
*   Descargar la nueva data de ARCOTEL.
*   Procesarla y generar los nuevos CSV.
*   Hacer *commit* y *push* de los cambios automáticamente.
*   Esto actualiza la página web sin intervención humana.

## 📂 Estructura del Proyecto

*   `datos_descargados/`: Almacena los archivos Excel crudos.
*   `output/`: Contiene los archivos CSV procesados listos para el dashboard.
*   `descargar_data.py`: Script de web scraping.
*   `etl_unified.py`: Lógica de transformación de datos.
*   `app.js`: Lógica del frontend (gráficos y filtros).
*   `style.css`: Estilos visuales (Modo oscuro, Glassmorphism).

---
Desarrollado con ❤️ para el análisis de datos abiertos en Ecuador.
