<?php
namespace Services;

class FinancialService {
    public static function process($raw) {
        // Valores base
        $nombre = trim($raw["nombre"] ?? "Proyecto Sin Nombre");
        $categoria = trim($raw["categoria"] ?? "General");
        
        $costo_materiales = floatval($raw["costo_materiales"] ?? 0);
        $mano_obra = floatval($raw["mano_obra"] ?? 0);
        $costos_indirectos = floatval($raw["costos_indirectos"] ?? 0);
        $utilidad_deseada_pct = floatval($raw["utilidad"] ?? 30); // Ejemplo: 30%
        
        $ventas_estimadas = intval($raw["ventas_estimadas"] ?? 100);
        if ($ventas_estimadas <= 0) $ventas_estimadas = 1;
        
        $iva_pct = floatval($raw["iva"] ?? 19) / 100; // Ejemplo: 19% de IVA

        // 1. Costo Variable Unitario
        $costo_variable_unitario = $costo_materiales;
        $costo_variable_total = $costo_variable_unitario * $ventas_estimadas;
        
        // 2. Costo Fijo Total (mano de obra + costos indirectos son valores unitarios, multiplicar por volumen)
        $costo_fijo_total = ($mano_obra + $costos_indirectos) * $ventas_estimadas;
        
        // 3. Costo Total y Unitario
        $costo_total = $costo_variable_total + $costo_fijo_total;
        $costo_unitario = $costo_total / $ventas_estimadas;
        
        // 4. Precio Sugerido con margen deseado
        // Fórmula: Precio = Costo Unitario / (1 - Margen Deseado %)
        $margin_factor = 1 - ($utilidad_deseada_pct / 100);
        if ($margin_factor <= 0.05) $margin_factor = 0.05; // Evitar división por cero
        
        $precio_sugerido = $costo_unitario / $margin_factor;
        
        // 5. Ganancia Neta y Margen
        $ingresos_totales = $precio_sugerido * $ventas_estimadas;
        $ganancia_neta_total = $ingresos_totales - $costo_total;
        $ganancia_neta_unitaria = $precio_sugerido - $costo_unitario;
        
        $margen_utilidad_real_pct = ($ganancia_neta_unitaria / $precio_sugerido) * 100;
        
        // 6. ROI (Retorno sobre Inversión)
        // ROI = (Ganancia Neta / Costo Total) * 100
        $roi = $costo_total > 0 ? ($ganancia_neta_total / $costo_total) * 100 : 0;
        
        // 7. Punto de Equilibrio (Break-Even)
        // Margen de Contribución Unitario = Precio - Costo Variable Unitario
        $margen_contribucion = $precio_sugerido - $costo_variable_unitario;
        $pe_unidades = 0;
        $pe_ingresos = 0;
        if ($margen_contribucion > 0) {
            $pe_unidades = ceil($costo_fijo_total / $margen_contribucion);
            $pe_ingresos = $pe_unidades * $precio_sugerido;
        }
        
        // 8. Impuestos (IVA)
        $iva_total = $ingresos_totales * $iva_pct;

        // Estructura de resultados finales
        return [
            "nombre" => $nombre,
            "categoria" => $categoria,
            "costo_total" => round($costo_total, 2),
            "costo_fijo" => round($costo_fijo_total, 2),
            "costo_variable" => round($costo_variable_total, 2),
            "costo_unitario" => round($costo_unitario, 2),
            "precio_sugerido" => round($precio_sugerido, 2),
            "margin_utilidad" => round($ganancia_neta_total, 2),
            "porcentaje_utilidad" => round($margen_utilidad_real_pct, 2),
            "roi" => round($roi, 2),
            "pe_unidades" => $pe_unidades,
            "pe_ingresos" => round($pe_ingresos, 2),
            "ganancia_neta" => round($ganancia_neta_total, 2),
            "ingresos" => round($ingresos_totales, 2),
            "impuestos" => round($iva_total, 2),
            "originales" => $raw
        ];
    }
}
?>
