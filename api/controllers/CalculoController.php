<?php
namespace Controllers;

use Models\Calculo;
use Services\FinancialService;
use Services\GeminiService;
use Helpers\Response;
use Exception;

class CalculoController {
    public function create($input) {
        $session_id = trim($input["session_id"] ?? "");
        $apiKey = trim($input["apiKey"] ?? "");
        $raw_json = $input["raw_json"] ?? null;
        
        if (empty($session_id) || empty($apiKey) || !$raw_json) {
            Response::json(["error" => "Datos incompletos para procesar el cálculo."], 400);
            return;
        }

        try {
            // 1. Procesar métricas financieras
            $metrics = FinancialService::process($raw_json);
            
            // 2. Generar recomendaciones vía Gemini
            $recomendaciones = GeminiService::generateRecommendations($apiKey, $metrics);
            
            // 3. Persistir en base de datos MySQL
            $calculo_id = Calculo::create($session_id, $metrics["nombre"], $metrics["categoria"], $metrics, $recomendaciones);
            
            Response::json([
                "success" => true,
                "id" => $calculo_id,
                "metrics" => $metrics,
                "recomendaciones" => $recomendaciones
            ]);
        } catch (Exception $e) {
            Response::json(["error" => "Error al guardar el cálculo: " . $e->getMessage()], 500);
        }
    }

    public function list($session_id) {
        $is_admin = isset($_GET["is_admin"]) && $_GET["is_admin"] === "true";
        
        if (empty($session_id) && !$is_admin) {
            Response::json(["error" => "session_id requerido"], 400);
            return;
        }
        
        try {
            $list = Calculo::getBySession($session_id, $is_admin);
            Response::json($list);
        } catch (Exception $e) {
            Response::json(["error" => "Error al obtener historial: " . $e->getMessage()], 500);
        }
    }

    public function detail($id) {
        if (empty($id)) {
            Response::json(["error" => "ID requerido"], 400);
            return;
        }

        try {
            $detail = Calculo::getById($id);
            if (!$detail) {
                Response::json(["error" => "El cálculo no existe"], 404);
                return;
            }
            Response::json($detail);
        } catch (Exception $e) {
            Response::json(["error" => "Error al obtener detalles: " . $e->getMessage()], 500);
        }
    }

    public function duplicate($id) {
        if (empty($id)) {
            Response::json(["error" => "ID requerido"], 400);
            return;
        }

        try {
            $new_id = Calculo::duplicate($id);
            Response::json(["success" => true, "id" => $new_id]);
        } catch (Exception $e) {
            Response::json(["error" => "Error al duplicar: " . $e->getMessage()], 500);
        }
    }

    public function delete($id) {
        if (empty($id)) {
            Response::json(["error" => "ID requerido"], 400);
            return;
        }

        try {
            Calculo::delete($id);
            Response::json(["success" => true]);
        } catch (Exception $e) {
            Response::json(["error" => "Error al eliminar: " . $e->getMessage()], 500);
        }
    }
}
?>
