<?php
  header('Content-Type: application/json; charset=UTF-8');

  error_reporting(E_ALL);
  ini_set('display_errors','On');
  set_time_limit(0) ;


  $data = array();

  $maxdeg = 1000000000;

  if (isset($_POST['maxdeg']) ) $maxdeg = $_POST['maxdeg'];

  if( !isset($data['error'])){


    // Connecting to Database
    $username = "postgres";
    $password = "postgres";
    $host = "localhost";
    $port = "5432";
    $dbname = "jacobian";

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


    // Getting corner information
    $query = "SELECT * FROM corner WHERE a + l*b <= l*{$maxdeg}";
    $result = pg_query($db, $query);
    echo pg_result_error($result);
    $data['corners'] = array();
    for ($x = 0; $x < pg_num_rows($result); $x++){
      $data['corners'][] = pg_fetch_assoc($result);
    }

    // Getting filter information
    $query = "SELECT * FROM filter";
    $result = pg_query($db, $query);
    echo pg_result_error($result);
    $data['filters'] = array();
    for ($x = 0; $x < pg_num_rows($result); $x++){
      $data['filters'][] = pg_fetch_assoc($result);
    }

    // Getting CornerXFilter information
    $query = "SELECT CF.* FROM corner_filter CF WHERE CF.corner_id in ( SELECT C.id FROM corner C WHERE C.a + C.l*C.b <= C.l*{$maxdeg} )";
    $result = pg_query($db, $query);
    echo pg_result_error($result);
    $data['corner_filters'] = array();
    for ($x = 0; $x < pg_num_rows($result); $x++){
      $data['corner_filters'][] = pg_fetch_assoc($result);
    }


    // Getting edge information
    $query = "SELECT E.* FROM edge E WHERE E.corner_id in ( SELECT C.id FROM corner C WHERE C.a + C.l*C.b <= C.l*{$maxdeg})";
    $result = pg_query($db, $query);
    echo pg_result_error($result);
    $data['edges'] = array();
    for ($x = 0; $x < pg_num_rows($result); $x++){
      $data['edges'][] = pg_fetch_assoc($result);
    }


    pg_close($db);
  }

  echo json_encode($data);

?>
