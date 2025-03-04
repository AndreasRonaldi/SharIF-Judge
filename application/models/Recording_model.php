<?php

/**
 * SharIF Judge online judge
 * @file Submit_model.php
 * @author Andreas Ronaldi <andreasronaldi25@gmail.com>
 */
defined('BASEPATH') or exit('No direct script access allowed');

class Recording_model extends CI_Model
{
	public function __construct()
	{
		parent::__construct();
	}

	public function all_user_recordings($assignment_id, $problem_id) {
		$arr['assignment'] = $assignment_id;
		$arr['problem'] = $problem_id;

		return $this->db
		// ->distinct()
			->group_by('username')
			->order_by('username asc')
			->get_where('recording', $arr)
			->result_array();
	}

	public function get_user_recordings($assignment_id, $problem_id, $username) {
		$arr['assignment'] = $assignment_id;
		$arr['problem'] = $problem_id;
		$arr['username'] = $username;

		return $this->db
			->order_by('upload_at asc')
			->get_where('recording', $arr)
			->result_array();
	}

	public function get_all_user_recording($assignment_id, $filter_user = NULL, $filter_problem = NULL)
	{
		$arr['assignment'] = $assignment_id;
		return $this->db->order_by('submit_id', 'desc')->get_where('recording', $arr)->result_array();
	}

	public function add_recording($rec_info) {
		$this->db->replace('recording', $rec_info);
	}
}
