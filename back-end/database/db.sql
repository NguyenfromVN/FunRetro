use sprint_retrospective;

create table users(
	id int auto_increment,
    PRIMARY KEY (id),
    username varchar(200),
    hash_password varchar(200),
    email varchar(100)
);

create table board(
	id int auto_increment,
    PRIMARY KEY (id),
    user_id int,
    foreign key (user_id) references users(id),
    board_name nvarchar(200),
    is_deleted tinyint
);

create table went_well(
	id int auto_increment,
    PRIMARY KEY (id),
    board_id int,
    foreign key (board_id) references board(id),
    content nvarchar(1000),
    is_deleted tinyint
);

create table to_improve(
	id int auto_increment,
    PRIMARY KEY (id),
    board_id int,
    foreign key (board_id) references board(id),
    content nvarchar(1000),
    is_deleted tinyint
);

create table action_items(
	id int auto_increment,
    PRIMARY KEY (id),
    board_id int,
    foreign key (board_id) references board(id),
    content nvarchar(1000),
    is_deleted tinyint
);

insert into users(username,hash_password,email)
values 
('BaoNguyen',NULL,'baonguyentqt@gmail.com');

insert into board(user_id,board_name,is_deleted)
values
(1,'example',0);

insert into action_items(board_id,content,is_deleted)
values
(1,'1st place',false),
(1,'become the best',false);

insert into to_improve(board_id,content,is_deleted)
values
(1,'5th place',false);

insert into went_well(board_id,content,is_deleted)
values
(1,'2st place',false);