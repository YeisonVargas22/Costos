<?php
// Habilitar reporte de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Autocarga de clases basada en Namespaces
spl_autoload_register(function ($class) {
    // Reemplazar namespaces por barras de directorio
    $classPath = str_replace('\\', DIRECTORY_SEPARATOR, $class);
    $file = __DIR__ . DIRECTORY_SEPARATOR . $classPath . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Manejo de peticiones preflight CORS OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    http_response_code(200);
    exit;
}

use Helpers\Response;
use Controllers\CalculoController;
use Controllers\DashboardController;

// Obtener ruta de la URL o query parameter (ej: api/index.php?route=calculos/list)
$route = trim($_GET["route"] ?? "");

// Instanciar controladores
$calculoController = new CalculoController();
$dashboardController = new DashboardController();

switch ($route) {
    case 'calculos/create':
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            Response::json(["error" => "Método no permitido. Se requiere POST."], 405);
        }
        $input = json_decode(file_get_contents("php://input"), true);
        $calculoController->create($input);
        break;
        
    case 'calculos/list':
        if ($_SERVER["REQUEST_METHOD"] !== "GET") {
            Response::json(["error" => "Método no permitido. Se requiere GET."], 405);
        }
        $session_id = $_GET["session_id"] ?? "";
        $calculoController->list($session_id);
        break;
        
    case 'calculos/detail':
        if ($_SERVER["REQUEST_METHOD"] !== "GET") {
            Response::json(["error" => "Método no permitido. Se requiere GET."], 405);
        }
        $id = intval($_GET["id"] ?? 0);
        $calculoController->detail($id);
        break;
        
    case 'calculos/duplicate':
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            Response::json(["error" => "Método no permitido. Se requiere POST."], 405);
        }
        $id = intval($_GET["id"] ?? 0);
        $calculoController->duplicate($id);
        break;
        
    case 'calculos/delete':
        if ($_SERVER["REQUEST_METHOD"] !== "POST" && $_SERVER["REQUEST_METHOD"] !== "DELETE") {
            Response::json(["error" => "Método no permitido."], 405);
        }
        // Aceptar DELETE o POST para mayor compatibilidad
        $id = intval($_GET["id"] ?? 0);
        $calculoController->delete($id);
        break;
        
    case 'dashboard/stats':
        if ($_SERVER["REQUEST_METHOD"] !== "GET") {
            Response::json(["error" => "Método no permitido. Se requiere GET."], 405);
        }
        $session_id = $_GET["session_id"] ?? "";
        $dashboardController->stats($session_id);
        break;
        
    default:
        Response::json(["error" => "Endpoint o acción no encontrada ($route)"], 404);
        break;
}
?>
