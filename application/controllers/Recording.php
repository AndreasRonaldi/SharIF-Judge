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
		if ($this->user->level <= 1) // permission denied
			show_404();

		$this->load->model('submit_model');
		// $this->load->library('SearchRequest');

		// $test = new SearchRequest();
	}

	public function index($assignment_id = NULL, $problem_id = 1, $username = NULL, $rec_id = 1)
	{
		// If no assignment is given, use selected assignment
		if ($assignment_id === NULL)
			$assignment_id = $this->user->selected_assignment['id'];

		if ($assignment_id == 0)
			show_error('No assignment selected.');

		$assignment = $this->assignment_model->assignment_info($assignment_id);
		$final_submission = $this->submit_model->get_final_submissions(
			$assignment_id,
			$this->user->level,
			$this->user->username,
			NULL,
			NULL,
			$problem_id
		);

		$data = array(
			'all_problems' => $this->assignment_model->all_problems($assignment_id),
			'assignment' => $assignment,
			'submissions' => $final_submission,
			'cur_problem' => $problem_id,
			'username' => $username
		);

		$this->twig->display('pages/recording.twig', $data);
	}

	// Needed for protobuf, not necessary
	public function proto($file = "test.proto")
	{
		$this->load->helper('file');
		$this->load->helper('url');
		// var_dump(base_url());

		$filepath = "./assets/proto/$file";

		// var_dump($filepath);

		// var_dump($this->settings_model->get_setting('assignments_root'));

		if (!file_exists($filepath)) {
			throw new Exception("File $filepath does not exist");
		}
		if (!is_readable($filepath)) {
			throw new Exception("File $filepath is not readable");
		}

		$file = glob($filepath);
		$content = file_get_contents($file[0]);
		header('Content-Type: application/protobuf');
		header('Content-Disposition: attachment; filename="test.proto"');
		die($content);
	}

	public function download_record()
	{
		// TODO: Create this function to get rec bin file
		$filepath = rtrim($this->settings_model->get_setting('assignments_root'), '/');

		echo $filepath;
	}

	public function reinstall_db()
	{
		$DATETIME = 'DATETIME';
		if ($this->db->dbdriver === 'postgre')
			$DATETIME = 'TIMESTAMP';

		$this->load->dbforge();

		$this->dbforge->drop_table('recording', TRUE);

		$fields = array(
			// 'id'			=> array('type' => 'INT', 'constraint' => 11, 'unsigned' => TRUE),
			'submit_id' 	=> array('type' => 'INT', 'constraint' => 11, 'unsigned' => TRUE),

			'timestart' 	=> array('type' => $DATETIME),
			'timeend' 		=> array('type' => $DATETIME),
			// 'file_name' 	=> array('type' => 'VARCHAR', 'constraint' => 100),

			'assignment' 	=> array('type' => 'SMALLINT', 'constraint' => 4, 'unsigned' => TRUE),
			'problem'       => array('type' => 'SMALLINT', 'constraint' => 4, 'unsigned' => TRUE),
			'username'      => array('type' => 'VARCHAR', 'constraint' => 20),
		);
		$this->dbforge->add_field($fields);
		$this->dbforge->add_key('submit_id', TRUE);
		$this->dbforge->add_key('assignment', TRUE);
		$this->dbforge->add_key('problem', TRUE);
		if (! $this->dbforge->create_table('recording', TRUE))
			show_error("Error creating database table " . $this->db->dbprefix('recording'));

		echo "done";
	}
}
