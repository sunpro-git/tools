-- 市町村名を正式名称（〇〇市/町/村）に更新

-- 本社/松本
UPDATE branch_assignments SET municipality = '松本市' WHERE municipality = '松本';
UPDATE branch_assignments SET municipality = '塩尻市' WHERE municipality = '塩尻';
UPDATE branch_assignments SET municipality = '安曇野市' WHERE municipality = '安曇野';
UPDATE branch_assignments SET municipality = '麻績村' WHERE municipality = '麻績';
UPDATE branch_assignments SET municipality = '生坂村' WHERE municipality = '生坂';
UPDATE branch_assignments SET municipality = '山形村' WHERE municipality = '山形';
UPDATE branch_assignments SET municipality = '朝日村' WHERE municipality = '朝日';
UPDATE branch_assignments SET municipality = '筑北村' WHERE municipality = '筑北';
UPDATE branch_assignments SET municipality = '大町市' WHERE municipality = '大町';
UPDATE branch_assignments SET municipality = '池田町' WHERE municipality = '池田';
-- 松川村はそのまま
UPDATE branch_assignments SET municipality = '白馬村' WHERE municipality = '白馬';
UPDATE branch_assignments SET municipality = '小谷村' WHERE municipality = '小谷';
UPDATE branch_assignments SET municipality = '木曽町' WHERE municipality = '木曽';
UPDATE branch_assignments SET municipality = '上松町' WHERE municipality = '上松';
UPDATE branch_assignments SET municipality = '南木曽町' WHERE municipality = '南木曽';
UPDATE branch_assignments SET municipality = '木祖村' WHERE municipality = '木祖';
UPDATE branch_assignments SET municipality = '王滝村' WHERE municipality = '王滝';
UPDATE branch_assignments SET municipality = '大桑村' WHERE municipality = '大桑';

-- 長野
UPDATE branch_assignments SET municipality = '長野市' WHERE municipality = '長野';
UPDATE branch_assignments SET municipality = '須坂市' WHERE municipality = '須坂';
UPDATE branch_assignments SET municipality = '千曲市' WHERE municipality = '千曲';
UPDATE branch_assignments SET municipality = '坂城町' WHERE municipality = '坂城';
UPDATE branch_assignments SET municipality = '小布施町' WHERE municipality = '小布施';
UPDATE branch_assignments SET municipality = '高山村' WHERE municipality = '高山';
UPDATE branch_assignments SET municipality = '小川村' WHERE municipality = '小川';
UPDATE branch_assignments SET municipality = '信濃町' WHERE municipality = '信濃';
UPDATE branch_assignments SET municipality = '飯綱町' WHERE municipality = '飯綱';
UPDATE branch_assignments SET municipality = '中野市' WHERE municipality = '中野';
UPDATE branch_assignments SET municipality = '飯山市' WHERE municipality = '飯山';
UPDATE branch_assignments SET municipality = '山ノ内町' WHERE municipality = '山ノ内';
UPDATE branch_assignments SET municipality = '木島平村' WHERE municipality = '木島平';
UPDATE branch_assignments SET municipality = '野沢温泉村' WHERE municipality = '野沢温泉';
UPDATE branch_assignments SET municipality = '栄村' WHERE municipality = '栄';

-- 上田
UPDATE branch_assignments SET municipality = '上田市' WHERE municipality = '上田';
UPDATE branch_assignments SET municipality = '東御市' WHERE municipality = '東御';
UPDATE branch_assignments SET municipality = '青木村' WHERE municipality = '青木';
UPDATE branch_assignments SET municipality = '長和町' WHERE municipality = '長和';
UPDATE branch_assignments SET municipality = '佐久市' WHERE municipality = '佐久' AND municipality != '佐久穂';
UPDATE branch_assignments SET municipality = '小諸市' WHERE municipality = '小諸';
UPDATE branch_assignments SET municipality = '軽井沢町' WHERE municipality = '軽井沢';
UPDATE branch_assignments SET municipality = '御代田町' WHERE municipality = '御代田';
UPDATE branch_assignments SET municipality = '立科町' WHERE municipality = '立科';
UPDATE branch_assignments SET municipality = '小海町' WHERE municipality = '小海';
UPDATE branch_assignments SET municipality = '佐久穂町' WHERE municipality = '佐久穂';
UPDATE branch_assignments SET municipality = '川上村' WHERE municipality = '川上';
UPDATE branch_assignments SET municipality = '南牧村' WHERE municipality = '南牧';
UPDATE branch_assignments SET municipality = '南相木村' WHERE municipality = '南相木';
UPDATE branch_assignments SET municipality = '北相木村' WHERE municipality = '北相木';

-- 伊那
UPDATE branch_assignments SET municipality = '岡谷市' WHERE municipality = '岡谷';
UPDATE branch_assignments SET municipality = '諏訪市' WHERE municipality = '諏訪' AND municipality != '下諏訪';
UPDATE branch_assignments SET municipality = '茅野市' WHERE municipality = '茅野';
UPDATE branch_assignments SET municipality = '下諏訪町' WHERE municipality = '下諏訪';
UPDATE branch_assignments SET municipality = '富士見町' WHERE municipality = '富士見';
UPDATE branch_assignments SET municipality = '原村' WHERE municipality = '原村';
UPDATE branch_assignments SET municipality = '伊那市' WHERE municipality = '伊那';
UPDATE branch_assignments SET municipality = '駒ヶ根市' WHERE municipality = '駒ヶ根';
UPDATE branch_assignments SET municipality = '辰野町' WHERE municipality = '辰野';
UPDATE branch_assignments SET municipality = '箕輪町' WHERE municipality = '箕輪';
UPDATE branch_assignments SET municipality = '飯島町' WHERE municipality = '飯島';
UPDATE branch_assignments SET municipality = '南箕輪村' WHERE municipality = '南箕輪';
UPDATE branch_assignments SET municipality = '宮田村' WHERE municipality = '宮田';

-- 飯田
UPDATE branch_assignments SET municipality = '飯田市' WHERE municipality = '飯田';
-- 松川町はそのまま
UPDATE branch_assignments SET municipality = '高森町' WHERE municipality = '高森';
UPDATE branch_assignments SET municipality = '阿南町' WHERE municipality = '阿南';
UPDATE branch_assignments SET municipality = '阿智村' WHERE municipality = '阿智';
UPDATE branch_assignments SET municipality = '平谷村' WHERE municipality = '平谷';
UPDATE branch_assignments SET municipality = '根羽村' WHERE municipality = '根羽';
UPDATE branch_assignments SET municipality = '下條村' WHERE municipality = '下條';
UPDATE branch_assignments SET municipality = '売木村' WHERE municipality = '売木';
UPDATE branch_assignments SET municipality = '天龍村' WHERE municipality = '天龍';
UPDATE branch_assignments SET municipality = '泰阜村' WHERE municipality = '泰阜';
UPDATE branch_assignments SET municipality = '喬木村' WHERE municipality = '喬木';
UPDATE branch_assignments SET municipality = '豊丘村' WHERE municipality = '豊丘';
UPDATE branch_assignments SET municipality = '大鹿村' WHERE municipality = '大鹿';
UPDATE branch_assignments SET municipality = '中川村' WHERE municipality = '中川';
