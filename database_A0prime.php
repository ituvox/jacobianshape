<?php
  header('Content-Type: application/json; charset=UTF-8');

  error_reporting(E_ALL);
  ini_set('display_errors','On');
  set_time_limit(0) ;


  $data = array();

  if (isset($_GET['maxdeg']) ) $maxdeg = $_GET['maxdeg'];


  // Connecting to Database
  $username = "postgres";
  $password = "postgres";
  $host = "localhost";
  $port = "5432";
  $dbname = "postgres";

  function exception_error_handler($errno, $errstr, $errfile, $errline ) {
    throw new ErrorException($errstr, $errno, 0, $errfile, $errline);
  }
  set_error_handler("exception_error_handler");

  try{
    $db = pg_connect("host={$host} port={$port} dbname={$dbname} user={$username} password={$password} connect_timeout=5");
  } catch (exception $e){
    echo $e->getMessage();
  }

  if (!$db) echo pg_last_error();


  // Getting possible A0' information
  $query = "SELECT * FROM possible_a0_prime WHERE 2*a <= {$maxdeg}";
  $result = pg_query($db, $query);
  echo pg_result_error($result);
  $data['edge_ends'] = array();
  for ($x = 0; $x < pg_num_rows($result); $x++){
    $data['edge_ends'][] = pg_fetch_assoc($result);
  }


  pg_close($db);

  echo json_encode($data);

?>
