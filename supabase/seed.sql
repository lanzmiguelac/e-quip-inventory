insert into public.equipment(asset_number,name,serial_number,category,location,condition,remarks) values
('EQ-001','Classroom Projector','PJ-DEMO-001','Audio-Visual','Room 201','Good','Includes remote, HDMI cable, and power cable.'),
('EQ-002','Digital Camera','CAM-DEMO-002','Photography','Media Room','Good','Includes battery, charger, and camera bag.'),
('EQ-003','Student Laptop','PC-DEMO-003','Computer','ICT Laboratory','Fair','Includes power adapter.'),
('EQ-004','Basketball','SP-DEMO-004','Sports','Gymnasium','Good','Indoor basketball.'),
('EQ-005','Laboratory Microscope','LAB-DEMO-005','Laboratory','Science Laboratory','Good','Handle with care.'),
('EQ-006','Wireless Microphone','AV-DEMO-006','Audio-Visual','AV Room','Good','Includes receiver and power supply.') on conflict(asset_number) do nothing;
