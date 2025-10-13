import { useEffect, useState } from "react";
import { instance } from "../../config/axios-instance";
import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
} from "antd";
import toast from "react-hot-toast";

const Users = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form] = Form.useForm();

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await instance.get("/admin/users");
        setData(res.data);
        setLoading(false);
      } catch (error) {
        toast.error("Foydalanuvchilarni yuklashda xatolik yuz berdi");
      }
    };
    getUsers();
  }, [loading]);

  const handleDelete = async (id) => {
    try {
      await instance.delete("/admin/guards/" + id);
      toast.success("Foydalanuvchi muvaffaqiyatli o‘chirildi");
      setLoading(true);
    } catch (error) {
      toast.error("Foydalanuvchini o‘chirishda xatolik yuz berdi");
    }
  };

  const handleCreate = async (values) => {
    try {
      await instance.post("/admin/guards", values);
      toast.success("Foydalanuvchi muvaffaqiyatli yaratildi");
      setIsFormModalOpen(false);
      form.resetFields();
      setLoading(true);
    } catch (error) {
      toast.error("Foydalanuvchini yaratishda xatolik yuz berdi");
    }
  };

  const handleEdit = async (values) => {
    try {
      await instance.patch("/admin/guards/" + selected.id, values);
      toast.success("Foydalanuvchi ma’lumotlari yangilandi");
      setIsFormModalOpen(false);
      form.resetFields();
      setLoading(true);
    } catch (error) {
      toast.error("Ma’lumotlarni yangilashda xatolik yuz berdi");
    }
  };

  const userColumns = [
    { title: "ID", dataIndex: "id" },
    { title: "Login", dataIndex: "login" },
    { title: "Foydalanuvchi nomi", dataIndex: "username" },
    { title: "Roli", dataIndex: "role" },
    {
      title: "Holati",
      dataIndex: "status",
      render: (status) =>
        status === "ACTIVE" ? (
          <p className="text-green-500">Faol</p>
        ) : (
          <p className="text-red-500">Nofaol</p>
        ),
    },
    {
      title: "Yaratilgan sana",
      dataIndex: "createdAt",
      render: (date) => new Date(date).toLocaleString("uz-UZ"),
    },
    {
      title: "Amallar",
      render: (_, record) => (
        <Space>
          {record?.status === "ACTIVE" && (
            <Button danger onClick={() => handleDelete(record.id)}>
              O‘chirish
            </Button>
          )}
          <Button
            type="default"
            onClick={() => {
              setSelected(record);
              setFormMode("edit");
              form.setFieldsValue(record);
              setIsFormModalOpen(true);
            }}
          >
            Tahrirlash
          </Button>

          <Button
            onClick={() => {
              setSelected(record);
              setIsModalOpen(true);
            }}
          >
            Batafsil
          </Button>
        </Space>
      ),
    },
  ];
  return (
    <div>
      <div className="mb-4">
        <Button
          type="primary"
          onClick={() => {
            setFormMode("create");
            setSelected(null);
            form.resetFields();
            setIsFormModalOpen(true);
          }}
        >
          Foydalanuvchi qo‘shish
        </Button>
      </div>

      <Table
        dataSource={data}
        rowKey={"id"}
        columns={userColumns}
        pagination={true}
        loading={loading}
      />

      {/* Batafsil modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        title="Foydalanuvchi tafsilotlari"
      >
        {selected && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Login">
              {selected.login}
            </Descriptions.Item>
            <Descriptions.Item label="Foydalanuvchi nomi">
              {selected.username}
            </Descriptions.Item>
            <Descriptions.Item label="Roli">{selected.role}</Descriptions.Item>
            <Descriptions.Item label="Holati">
              {selected.status === "ACTIVE" ? (
                <p className="text-green-500">Faol</p>
              ) : (
                <p className="text-red-500">Nofaol</p>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Yaratilgan sana">
              {new Date(selected.createdAt).toLocaleString("uz-UZ")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Qo‘shish / Tahrirlash modal */}
      <Modal
        open={isFormModalOpen}
        onCancel={() => setIsFormModalOpen(false)}
        footer={null}
        title={
          formMode === "create"
            ? "Yangi foydalanuvchi qo‘shish"
            : "Foydalanuvchini tahrirlash"
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            formMode === "create" ? handleCreate(values) : handleEdit(values)
          }
        >
          <Form.Item
            label="Login"
            name="login"
            rules={[{ required: true, message: "Loginni kiriting" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Foydalanuvchi nomi" name="username">
            <Input />
          </Form.Item>
          {formMode == "create" ? (
            <>
              <Form.Item
                label="Parol"
                name="password"
                rules={[{ required: true, message: "Parolni kiriting" }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="Roli"
                name="role"
                rules={[{ required: true, message: "Rolni tanlang" }]}
              >
                <Select
                  options={[
                    { label: "Admin", value: "ADMIN" },
                    { label: "Qo‘riqchi", value: "GUARD" },
                    { label: "Operator", value: "OPERATOR" },
                  ]}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="Yangi parol"
                name="password"
                rules={[{ required: false }]}
              >
                <Input.Password placeholder="Agar o‘zgartirmoqchi bo‘lmasangiz, bo‘sh qoldiring" />
              </Form.Item>
              <Form.Item
                label="Holati"
                name="status"
                rules={[{ required: true, message: "Holatni tanlang" }]}
              >
                <Select
                  options={[
                    { label: "Faol", value: "ACTIVE" },
                    { label: "Nofaol", value: "INACTIVE" },
                  ]}
                />
              </Form.Item>
            </>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {formMode === "create" ? "Qo‘shish" : "Yangilash"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
