<?php
namespace Controllers;

use Models\Calculo;
use Helpers\Response;
use Exception;

class DashboardController {
    public function stats($session_id) {
        $is_admin = isset($_GET["is_admin"]) && $_GET["is_admin"] === "true";
        
        if (empty($session_id) && !$is_admin) {
            Response::json(["error" => "session_id requerido"], 400);
            return;
        }

        try {
            $stats = Calculo::getStats($session_id, $is_admin);
            Response::json($stats);
        } catch (Exception $e) {
            Response::json(["error" => "Error al obtener estadísticas del dashboard: " . $e->getMessage()], 500);
        }
    }
}
?>
