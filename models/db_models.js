var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
	sys_info: {
		sys_status: String, // active, modify, remove
		sys_last_login: Date,
		sys_reg_date: Date,
		sys_pool_expire_date: Date
	},
	personal_info: {
		email: String,
		passwd: String, //hash created from password
		name: String,
		birth_date: Number,
		phone: String,
		addr1: String,
		addr2: String,
		post_no: String,
		lng: Number,
		lat: Number,
		user_type: Number,
		reg_date: {type:String, default:""},
		last_login: {type:String, default:""},
		push_id: String,
		testimonial_count: {type:Number, default:0},
		status: String
	},
	sitter_info: {
		gender: Number,
		sons: Number,
		daughters: Number,
		work_exp: Number,
		term_from: Number,
		term_to: Number,
		skill: String,
		commute_type: Number,
		distance_limit: Number,
		mon: String,
		tue: String,
		wed: String,
		thu: String,
		fri: String,
		sat: String,
		sun: String,
		salary: Number,
		env_pet: Number,
		env_cctv: Number,
		evn_adult: Number,
		baby_gender: Number,
		baby_age: String,
		religion: String,
		nat: String,
		visa_exp: Number,
		brief: String,
		introduction: String,

		license: String,
		edu: String,
		school: String,
		department: String
	},
	parent_info: {
		gender: String,
		term_from: Number,
		term_to: Number,
		commute_type: Number,
		distance_limit: Number,
		mon: String,
		tue: String,
		wed: String,
		thu: String,
		fri: String,
		sat: String,
		sun: String,
		salary: Number,
		skill: String,
		work_exp: Number,
		env_pet: Number,
		env_cctv: Number,
		env_adult: Number,
		nat: String,
		edu: Number,
		religion: String,
		brief: String,
		introduction: String,
		sitter_age: Number,
		children_info: [{
			name: String,
			birth: Number,
			gender: Number,
			is_care: Number,
			is_expect: Number
		}]
	},
	image_info: {
		prf_img_url: String,
		id_img_url: String
	}
});

var favoriteSchema = new mongoose.Schema({
	email: String,
	favorite_email: String,
	reg_date: {type:String, default:""},
	sys_reg_date: Date
});

var imgHistSchema = new mongoose.Schema({
	email: String,
	img_name: String,
	img_path: String,
	img_type: Number,
	reg_date: String,
	use_yn: String
});

var testimonialSchema = new mongoose.Schema({
	email: String,
	writer_email: String,
	writer_name: String,
	content: String,
	reg_date: {type:String, default:""},
	sys_reg_date: Date
});

var memoSchema = new mongoose.Schema({
	sender: String,
	receiver: String,
	title: String,
	text: String,
	date: String,
	del_yn: String,
	sys_post_date: Date,
	sys_edit_date: Date
});

var contactSchema = new mongoose.Schema({
	req_email: String,
	rcv_email: String,
	req_msg: String,
	rcv_msg: String,
	req_date: {type:String, default:""},
	rcv_date: {type:String, default:""},
	last_update: {type:String, default:""},
	sys_req_date: Date,
	sys_rcv_date: Date,
	sys_last_update: Date,
	status: Number
});

var pushSchema = new mongoose.Schema({
	email: String,
	sender: String,
	type: String,
	msg: String,
	is_send_success: String,
	is_read: String,
	is_confirm: String,
	req_date: String,
	read_date: String,
	confirm_date: String,
	sys_req_date: Date,
	sys_read_date: Date,
	sys_confirm_date: Date
});

var userStatusSchema = new mongoose.Schema({
	email: String,
	action_type: String,
	content: String,
	reg_date: String,
	sys_reg_date: Date
});

/*
var postSchema = new mongoose.Schema({
    created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
    created_at: {type: Date, default: Date.now},
    text: String
});

mongoose.model('Post', postSchema);
*/

mongoose.model('User', userSchema);
mongoose.model('Favorite', favoriteSchema);
mongoose.model('User_History', userSchema);
mongoose.model('Testimonial', testimonialSchema);
mongoose.model('Testimonial_History', testimonialSchema);
mongoose.model('Memo', memoSchema);
mongoose.model('Contact', contactSchema);
mongoose.model('Contact_History', contactSchema);
mongoose.model('Image_History', imgHistSchema);
mongoose.model('Push', pushSchema);
mongoose.model('User_Status', userStatusSchema);
