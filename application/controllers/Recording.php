<?php

/**
 * SharIF Judge online judge
 * @file Recording.php
 * @author Andreas Ronaldi <andreasronaldi25@gmail.com>
 */
defined('BASEPATH') or exit('No direct script access allowed');

class Recording extends CI_Controller
{
	public function __construct()
	{
		parent::__construct();
		if (! $this->session->userdata('logged_in')) // if not logged in
			redirect('login');
		if ($this->user->level < 1) // permission denied
			show_404();

		$this->load->model('recording_model');

		$input = $this->uri->uri_to_assoc();

		$this->filter_user = $this->filter_problem = NULL;
		if (array_key_exists('user', $input) && $input['user'])
			$this->filter_user = $this->form_validation->alpha_numeric($input['user']) ? $input['user'] : NULL;
		if (array_key_exists('problem', $input) && $input['problem'])
			$this->filter_problem = is_numeric($input['problem']) ? $input['problem'] : NULL;
	}

	// For seeing all recording
	public function all()
	{
		// use selected assignment
		$assignment_id = $this->user->selected_assignment['id'];

		if ($assignment_id == 0)
			show_error('No assignment selected.');

		$problem = $this->assignment_model->all_problems($assignment_id);
		$assignment = $this->assignment_model->assignment_info($assignment_id);
		$recordings = $this->recording_model->all_user_recordings($assignment_id, $this->filter_problem, $this->filter_user);
		$metric = $this->recording_model->get_recordings_metrics($assignment_id, $this->filter_problem);
		$names = $this->user_model->get_names();

		foreach ($recordings as &$item) {
			$item['name'] = $names[$item['username']];

			$temp = $item['problem'];

			$ms = array_filter($metric, function ($arr) use ($temp) {
				return $arr['problem'] === $temp;
			});

			$m = reset($ms);

			var_dump($m);
			var_dump($item);
			
			$calc = 0;
			
			$calc += min(max(($m['avg_cct'] - $item['cct']) / $m['avg_cct'], 0) * 0.25, 0.25);
			$calc += min($item['pause_avg'] / max($m['avg_pause_avg'], 0.01), 1) * 0.05;
			$calc += min($item['pause_max'] / max($m['max_pause_max'], 0.01), 1) * 0.05;
			
			$calc += $item['pause_ratio'] * 0.1;
			
			if (!$item['debug_changes'])
				$calc += 0.025;
			if (!$item['debug_input_exec'])
				$calc += 0.025;
			if (!$item['debug_output'])
				$calc += 0.025;
			
			if ($item['nav_excessive'])
				$calc += 0.1;
		
			if ($item['cp_other_source'])
				$calc += 0.25;
			if ($item['cp_large_insert'])
				$calc += 0.1;
			
			if ($item['cp_large_remove'])
				$calc += 0.025;
		
				
			$item['score'] = number_format($calc * 100, 2);
		}

		$data = array(
			'all_problems' => $problem,
			'assignment' => $assignment,
			// 'metric' => $metric,
			'recordings' => $recordings,
			'filter_problem' => $this->filter_problem,
			'filter_user' => $this->filter_user,
		);

		$this->twig->display('pages/recording_list.twig', $data);
	}

	public function index($assignment_id = NULL, $problem_id = 1, $username = NULL, $rec_id = NULL)
	{
		// If no assignment is given, use selected assignment
		if ($assignment_id === NULL)
			redirect('recording/all');

		if ($assignment_id == 0)
			show_error('No assignment selected.');

		$assignment = $this->assignment_model->assignment_info($assignment_id);

		$data = array(
			'all_problems' => $this->assignment_model->all_problems($assignment_id),
			'assignment' => $assignment,
			'filter_user' => $username,
			'filter_problem' => $problem_id,
		);

		if ($username !== NULL) {
			$list_rec = $this->recording_model->get_user_recordings($assignment_id, $problem_id, $username);
			$data['list_recording'] = $list_rec;

			if ($rec_id === NULL && $list_rec) {
				$rec_id = $list_rec[0]['rec_id'];
			}

			$data['rec_id'] = $rec_id;
		}

		$this->twig->display('pages/recording.twig', $data);
	}

	public function download_record($assignment_id, $problem_id, $username, $rec_id)
	{
		$assignment_root = rtrim($this->settings_model->get_setting('assignments_root'), '/');
		$file_path = $assignment_root . '/assignment_' . $assignment_id . '/p' . $problem_id . '/' . $username;
		$rec_path = $file_path . '/' . RECORD_FILE_NAME . '.' . RECORD_FILE_EXT;

		if ($rec_id !== "0") {
			$rec_path = $file_path . '/' . RECORD_FILE_NAME . '-' . $rec_id . '.' . RECORD_FILE_EXT;
		}

		$this->load->helper('file');
		$this->load->helper('url');

		if (!file_exists($rec_path)) {
			throw new Exception("File $rec_path does not exist");
		}
		if (!is_readable($rec_path)) {
			throw new Exception("File $rec_path is not readable");
		}

		$file = glob($rec_path);
		$content = file_get_contents($file[0]);
		header('Content-Type: application/json');
		header('Content-Disposition: attachment; filename="rec.json"');
		die($content);

		// echo $rec_path;
	}

	public function install_db_recording()
	{
		if ($this->user->level <= 2) // permission denied
			show_404();

		$DATETIME = 'DATETIME';
		if ($this->db->dbdriver === 'postgre')
			$DATETIME = 'TIMESTAMP';

		$this->load->dbforge();
		// $this->dbforge->drop_table('recording', TRUE);

		$fields = array(
			'rec_id' 		=> array('type' => 'INT', 'constraint' => 11, 'unsigned' => TRUE),
			'upload_at'		=> array('type' => $DATETIME),
			'assignment' 	=> array('type' => 'SMALLINT', 'constraint' => 4, 'unsigned' => TRUE),
			'problem'       => array('type' => 'SMALLINT', 'constraint' => 4, 'unsigned' => TRUE),
			'username'      => array('type' => 'VARCHAR', 'constraint' => 20),

			// metrics with averages
			'cct'			=> array('type' => 'FLOAT'), // 25%
			'pause_avg' => array('type' => 'FLOAT'), // 5
			'pause_max' => array('type' => 'INT', 'constraint' => 11), // 5 

			// for score
			'pause_ratio' => array('type' => 'FLOAT'), // 10%
			'debug_changes' => array('type' => 'TINYINT', 'constraint' => 1), // 2.5
			'debug_input_exec' => array('type' => 'TINYINT', 'constraint' => 1), // 2.5
			'debug_output' => array('type' => 'TINYINT', 'constraint' => 1), // 2.5
			'nav_excessive' => array('type' => 'TINYINT', 'constraint' => 1), // 10
			'cp_other_source' => array('type' => 'TINYINT', 'constraint' => 1), // 25
			'cp_large_insert' => array('type' => 'TINYINT', 'constraint' => 1), // 10 
			'cp_large_remove' => array('type' => 'TINYINT', 'constraint' => 1), // 2.5
		);
		$this->dbforge->add_field($fields);
		if (! $this->dbforge->create_table('recording', TRUE))
			show_error("Error creating database table " . $this->db->dbprefix('recording'));
		// ADD Unique constraint
		$this->db->query(
			"ALTER TABLE {$this->db->dbprefix('recording')}
			 ADD CONSTRAINT {$this->db->dbprefix('ruap_unique')} UNIQUE (rec_id, username, assignment, problem);"
		);

		echo "done " . shj_now_str();
	}

	public function drop_db_recording()
	{
		if ($this->user->level <= 2) // permission denied
			show_404();

		$this->load->dbforge();
		$this->dbforge->drop_table('recording', TRUE);

		echo "done " . shj_now_str();
	}
}
