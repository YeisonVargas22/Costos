<?php
header("Content-Type: application/json");
echo json_encode([
    "getenv" => [
        "MYSQLHOST" => getenv('MYSQLHOST'),
        "MYSQLUSER" => getenv('MYSQLUSER'),
        "MYSQLPASSWORD" => getenv('MYSQLPASSWORD') !== false ? "set" : "not set",
        "MYSQLDATABASE" => getenv('MYSQLDATABASE'),
        "MYSQLPORT" => getenv('MYSQLPORT'),
        "PORT" => getenv('PORT')
    ],
    "env_keys" => array_keys($_ENV),
    "server_keys" => array_keys($_SERVER)
], JSON_PRETTY_PRINT);
?>
