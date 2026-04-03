-- model_house_staff_order → staff_display_order にリネーム + カラム名汎用化
alter table model_house_staff_order rename to staff_display_order;
alter table staff_display_order rename column model_house to category;

-- ユニーク制約をリネーム
alter table staff_display_order drop constraint if exists model_house_staff_order_model_house_staff_name_key;
alter table staff_display_order add constraint staff_display_order_category_staff_name_key unique (category, staff_name);
