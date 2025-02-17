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
			
		$this->load->library('SearchRequest');
		
		$test = new SearchRequest();
	}

	public function index($assignment_id = NULL, $problem_id = 1, $user_id = NULL)
	{
		// If no assignment is given, use selected assignment
		if ($assignment_id === NULL)
			$assignment_id = $this->user->selected_assignment['id'];

		if ($assignment_id == 0)
			show_error('No assignment selected.');

		$assignment = $this->assignment_model->assignment_info($assignment_id);

		$data = array(
			'all_problems' => $this->assignment_model->all_problems($assignment_id),
			'assignment' => $assignment,
		);

		$this->twig->display('pages/recording.twig', $data);
	}
}
