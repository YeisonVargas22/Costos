<?php
namespace Services;

class GeminiService {
    public static function generateRecommendations($apiKey, $metrics) {
        $prompt = "Actua como un Consultor Financiero Experto y Asesor de Costos para Negocios.
Analiza los siguientes resultados financieros calculados para el proyecto \"" . $metrics["nombre"] . "\" (" . $metrics["categoria"] . "):
- Costo Total: Bs. " . $metrics["costo_total"] . "
- Costo Unitario: Bs. " . $metrics["costo_unitario"] . "
- Costo Fijo Total: Bs. " . $metrics["costo_fijo"] . "
- Costo Variable Total: Bs. " . $metrics["costo_variable"] . "
- Precio de Venta Sugerido: Bs. " . $metrics["precio_sugerido"] . "
- Margen de Utilidad Neto: Bs. " . $metrics["ganancia_neta"] . " (Porcentaje real: " . $metrics["porcentaje_utilidad"] . "%)
- Retorno sobre la Inversion (ROI): " . $metrics["roi"] . "%
- Punto de Equilibrio: " . $metrics["pe_unidades"] . " unidades (Ingresos de equilibrio: Bs. " . $metrics["pe_ingresos"] . ")
- Ventas Estimadas: " . $metrics["originales"]["ventas_estimadas"] . " unidades.

Por favor, genera entre 3 y 5 recomendaciones de negocio especificas, directas, numericas y accionables en espanol latinoamericano (maximo 150 palabras). Cada recomendacion DEBE comenzar con el texto 'CHECK ' seguido del consejo (ej: 'CHECK El costo de X representa el Y%.', 'CHECK Si aumentas el precio un 5%, tu utilidad creceria un 18%.'). Sin introducciones, sin saludos. Solo los consejos separados por salto de linea.";

        $url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $prompt]
                    ]
                ]
            ]
        ];

        try {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if (isset($data["candidates"][0]["content"]["parts"][0]["text"])) {
                    return $data["candidates"][0]["content"]["parts"][0]["text"];
                }
            }

            // Fallback cuando Gemini no esta disponible (ej. cuota excedida)
            return "CHECK El margen de utilidad estimado es del " . $metrics["porcentaje_utilidad"] . "%. Considera renegociar con tus proveedores.\nCHECK Debes vender al menos " . $metrics["pe_unidades"] . " unidades para alcanzar el punto de equilibrio.\nCHECK Si disminuyes tus costos fijos de Bs. " . $metrics["costo_fijo"] . " un 10%, mejoraras tu retorno de inversion.\nCHECK Con un precio sugerido de Bs. " . $metrics["precio_sugerido"] . " puedes mantener tu margen objetivo.";
        } catch (\Exception $e) {
            return "CHECK Error al contactar con la IA. Margen actual: " . $metrics["porcentaje_utilidad"] . "%. Precio sugerido: Bs. " . $metrics["precio_sugerido"] . ".";
        }
    }
}
?>
