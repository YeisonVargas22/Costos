<?php
namespace Models;

use Config\Database;
use PDO;
use Exception;

class Calculo {
    public static function create($session_id, $nombre, $categoria, $metrics, $recomendaciones) {
        $pdo = Database::getConnection();
        
        try {
            $pdo->beginTransaction();
            
            // 1. Insertar en calculos
            $stmt = $pdo->prepare("INSERT INTO calculos (session_id, nombre, categoria) VALUES (?, ?, ?)");
            $stmt->execute([$session_id, $nombre, $categoria]);
            $calculo_id = $pdo->lastInsertId();
            
            // 2. Insertar en detalle_costos
            $stmtDetails = $pdo->prepare("INSERT INTO detalle_costos (calculo_id, total_costo, costo_fijo, costo_variable, precio_sugerido, roi, pe_unidades, resultados_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            
            $resultados_json = json_encode($metrics, JSON_UNESCAPED_UNICODE);
            $stmtDetails->execute([
                $calculo_id,
                $metrics["costo_total"],
                $metrics["costo_fijo"],
                $metrics["costo_variable"],
                $metrics["precio_sugerido"],
                $metrics["roi"],
                $metrics["pe_unidades"],
                $resultados_json
            ]);
            
            // 3. Insertar en recomendaciones
            $stmtRecom = $pdo->prepare("INSERT INTO recomendaciones (calculo_id, recomendaciones_texto) VALUES (?, ?)");
            $stmtRecom->execute([$calculo_id, $recomendaciones]);
            
            $pdo->commit();
            return $calculo_id;
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function getBySession($session_id, $is_admin = false) {
        $pdo = Database::getConnection();
        
        $sql = "
            SELECT c.id, c.nombre, c.categoria, d.total_costo, d.precio_sugerido, d.roi, d.pe_unidades, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') as fecha_formateada
            FROM calculos c
            JOIN detalle_costos d ON c.id = d.calculo_id
        ";
        
        if (!$is_admin) {
            $sql .= " WHERE c.session_id = ? ";
        }
        $sql .= " ORDER BY c.id DESC ";
        
        $stmt = $pdo->prepare($sql);
        if (!$is_admin) {
            $stmt->execute([$session_id]);
        } else {
            $stmt->execute();
        }
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getById($id) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT c.id, c.session_id, c.nombre, c.categoria, d.total_costo, d.costo_fijo, d.costo_variable, d.precio_sugerido, d.roi, d.pe_unidades, d.resultados_json, r.recomendaciones_texto, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') as fecha_formateada
            FROM calculos c
            JOIN detalle_costos d ON c.id = d.calculo_id
            JOIN recomendaciones r ON c.id = r.calculo_id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row["resultados_json"] = json_decode($row["resultados_json"], true);
        }
        return $row;
    }

    public static function duplicate($id) {
        $pdo = Database::getConnection();
        $original = self::getById($id);
        if (!$original) {
            throw new Exception("El cálculo original no existe.");
        }
        
        $copiaNombre = $original["nombre"] . " (Copia)";
        return self::create(
            $original["session_id"],
            $copiaNombre,
            $original["categoria"],
            $original["resultados_json"],
            $original["recomendaciones_texto"]
        );
    }

    public static function delete($id) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM calculos WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function getStats($session_id, $is_admin = false) {
        $pdo = Database::getConnection();
        
        // 1. Conteo total de cálculos
        $sqlCount = "SELECT COUNT(*) as total FROM calculos";
        if (!$is_admin) {
            $sqlCount .= " WHERE session_id = ?";
        }
        $stmtCount = $pdo->prepare($sqlCount);
        if (!$is_admin) {
            $stmtCount->execute([$session_id]);
        } else {
            $stmtCount->execute();
        }
        $total = intval($stmtCount->fetch(PDO::FETCH_ASSOC)["total"] ?? 0);
        
        // 2. Costo Promedio y Ganancia Promedio
        $sqlAvg = "
            SELECT AVG(d.total_costo) as avg_costo, AVG(d.precio_sugerido - d.total_costo) as avg_ganancia 
            FROM calculos c
            JOIN detalle_costos d ON c.id = d.calculo_id
        ";
        if (!$is_admin) {
            $sqlAvg .= " WHERE c.session_id = ?";
        }
        $stmtAvg = $pdo->prepare($sqlAvg);
        if (!$is_admin) {
            $stmtAvg->execute([$session_id]);
        } else {
            $stmtAvg->execute();
        }
        $avg = $stmtAvg->fetch(PDO::FETCH_ASSOC);
        
        // 3. Productos más rentables (Ranking por ROI)
        $sqlRentables = "
            SELECT c.nombre, c.categoria, d.roi
            FROM calculos c
            JOIN detalle_costos d ON c.id = d.calculo_id
        ";
        if (!$is_admin) {
            $sqlRentables .= " WHERE c.session_id = ?";
        }
        $sqlRentables .= " ORDER BY d.roi DESC LIMIT 5 ";
        
        $stmtRentables = $pdo->prepare($sqlRentables);
        if (!$is_admin) {
            $stmtRentables->execute([$session_id]);
        } else {
            $stmtRentables->execute();
        }
        $rentables = $stmtRentables->fetchAll(PDO::FETCH_ASSOC);
        
        // 4. Últimos cálculos
        $sqlUltimos = "
            SELECT c.id, c.nombre, c.categoria, d.precio_sugerido, d.total_costo, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') as fecha_formateada
            FROM calculos c
            JOIN detalle_costos d ON c.id = d.calculo_id
        ";
        if (!$is_admin) {
            $sqlUltimos .= " WHERE c.session_id = ?";
        }
        $sqlUltimos .= " ORDER BY c.id DESC LIMIT 5 ";
        
        $stmtUltimos = $pdo->prepare($sqlUltimos);
        if (!$is_admin) {
            $stmtUltimos->execute([$session_id]);
        } else {
            $stmtUltimos->execute();
        }
        $ultimos = $stmtUltimos->fetchAll(PDO::FETCH_ASSOC);

        return [
            "total_calculos" => $total,
            "costo_promedio" => round(floatval($avg["avg_costo"] ?? 0), 2),
            "ganancia_promedio" => round(floatval($avg["avg_ganancia"] ?? 0), 2),
            "ranking_rentabilidad" => $rentables,
            "ultimos_calculos" => $ultimos
        ];
    }
}
?>
