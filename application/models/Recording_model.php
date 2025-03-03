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

	public function get_recordings($username, $assignment, $problem, $submit_id) {}

	public function get_all_recording($assignment_id, $filter_user = NULL, $filter_problem = NULL)
	{
		$arr['assignment'] = $assignment_id;
		return $this->db->order_by('submit_id', 'desc')->get_where('recording', $arr)->result_array();
	}

	public function add_recording($rec_info) {
		$this->db->replace('submissions', $rec_info);
	}
}
