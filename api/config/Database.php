<?php
namespace Config;

use PDO;
use PDOException;

class Database {
    private static $host = null;
    private static $username = null;
    private static $password = null;
    private static $dbname = null;
    private static $port = null;
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            // Intentar leer variable de conexión directa de Railway (MYSQL_URL o DATABASE_URL)
            $connectionUrl = getenv('MYSQL_URL') ?: getenv('DATABASE_URL');
            
            if ($connectionUrl) {
                $dbParts = parse_url($connectionUrl);
                self::$host = $dbParts['host'] ?? "localhost";
                self::$port = $dbParts['port'] ?? "3306";
                self::$username = $dbParts['user'] ?? "root";
                self::$password = isset($dbParts['pass']) ? urldecode($dbParts['pass']) : "";
                self::$dbname = isset($dbParts['path']) ? ltrim($dbParts['path'], '/') : "controlcostos_db";
            } else {
                // Caer en variables individuales o valores locales por defecto
                self::$host = getenv('MYSQLHOST') ?: "localhost";
                self::$username = getenv('MYSQLUSER') ?: "root";
                self::$password = getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : "";
                self::$dbname = getenv('MYSQLDATABASE') ?: "controlcostos_db";
                self::$port = getenv('MYSQLPORT') ?: "3306";
            }

            try {
                // Conectar inicialmente a MySQL
                $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";charset=utf8";
                $conn = new PDO($dsn, self::$username, self::$password);
                $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Crear base de datos (por si no existe, aunque Railway suele dar una ya creada)
                $conn->exec("CREATE DATABASE IF NOT EXISTS `" . self::$dbname . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                // Reconectar seleccionando la base de datos
                self::$pdo = new PDO("mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$dbname . ";charset=utf8", self::$username, self::$password);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Crear tablas necesarias
                self::createTables();
                
            } catch (PDOException $e) {
                header("Content-Type: application/json");
                echo json_encode(["error" => "Error de conexión con la base de datos: " . $e->getMessage()]);
                exit;
            }
        }
        return self::$pdo;
    }

    private static function createTables() {
        // 1. Tabla calculos
        self::$pdo->exec("CREATE TABLE IF NOT EXISTS `calculos` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `session_id` VARCHAR(100) NOT NULL,
            `nombre` VARCHAR(150) NOT NULL,
            `categoria` VARCHAR(50) NOT NULL,
            `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 2. Tabla detalle_costos
        self::$pdo->exec("CREATE TABLE IF NOT EXISTS `detalle_costos` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `calculo_id` INT NOT NULL,
            `total_costo` DECIMAL(15,2) NOT NULL,
            `costo_fijo` DECIMAL(15,2) NOT NULL,
            `costo_variable` DECIMAL(15,2) NOT NULL,
            `precio_sugerido` DECIMAL(15,2) NOT NULL,
            `roi` DECIMAL(15,2) NOT NULL,
            `pe_unidades` INT NOT NULL,
            `resultados_json` TEXT NOT NULL,
            FOREIGN KEY (`calculo_id`) REFERENCES `calculos`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 3. Tabla recomendaciones
        self::$pdo->exec("CREATE TABLE IF NOT EXISTS `recomendaciones` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `calculo_id` INT NOT NULL,
            `recomendaciones_texto` TEXT NOT NULL,
            FOREIGN KEY (`calculo_id`) REFERENCES `calculos`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    }
}
?>
