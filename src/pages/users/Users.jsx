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
        toast.error("Failed to fetch users");
      }
    };
    getUsers();
  }, [loading]);

  const handleDelete = async (id) => {
    try {
      await instance.delete("/admin/guards/" + id);
      toast.success("User deleted successfully");
      setLoading(true);
    } catch (error) {
      toast.error("Error deleting user");
    }
  };

  const handleCreate = async (values) => {
    try {
      await instance.post("/admin/guards", values);
      toast.success("User created successfully");
      setIsFormModalOpen(false);
      form.resetFields();
      setLoading(true);
    } catch (error) {
      toast.error("Error creating user");
    }
  };

  const handleEdit = async (values) => {
    try {
      await instance.patch("/admin/guards/" + selected.id, values);
      toast.success("User updated successfully");
      setIsFormModalOpen(false);
      form.resetFields();
      setLoading(true);
    } catch (error) {
      toast.error("Error updating user");
    }
  };

  const userColumns = [
    { title: "ID", dataIndex: "id" },
    { title: "Login", dataIndex: "login" },
    { title: "Username", dataIndex: "username" },
    { title: "Role", dataIndex: "role" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) =>
        status === "ACTIVE" ? (
          <p className="text-green-500">{status}</p>
        ) : (
          <p className="text-red-500">{status}</p>
        ),
    },
    {
      title: "Created at",
      dataIndex: "createdAt",
      render: (date) => new Date(date).toLocaleString("uz-Uz"),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          {record?.status === "ACTIVE" && (
            <Button danger onClick={() => handleDelete(record.id)}>
              Delete
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
            Edit
          </Button>

          <Button
            onClick={() => {
              setSelected(record);
              setIsModalOpen(true);
            }}
          >
            More
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
          Create User
        </Button>
      </div>

      <Table
        dataSource={data}
        rowKey={"id"}
        columns={userColumns}
        pagination={true}
        loading={loading}
      />

      {/* More Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        title="User Details"
      >
        {selected && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Login">
              {selected.login}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              {selected.username}
            </Descriptions.Item>
            <Descriptions.Item label="Role">{selected.role}</Descriptions.Item>
            <Descriptions.Item label="Status">
              {selected.status === "ACTIVE" ? (
                <p className="text-green-500">{selected.status}</p>
              ) : (
                <p className="text-red-500">{selected.status}</p>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created at">
              {new Date(selected.createdAt).toLocaleString("uz-Uz")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={isFormModalOpen}
        onCancel={() => setIsFormModalOpen(false)}
        footer={null}
        title={formMode === "create" ? "Create User" : "Edit User"}
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
            rules={[{ required: true, message: "Please enter login" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Username" name="username">
            <Input />
          </Form.Item>
          {formMode == "create" ? (
            <>
              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: "Please enter username" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: "Please select role" }]}
              >
                <Select
                  options={[
                    { label: "Admin", value: "ADMIN" },
                    { label: "Guard", value: "GUARD" },
                    { label: "Operator", value: "OPERATOR" },
                  ]}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Please select status" }]}
            >
              <Select
                options={[
                  { label: "Active", value: "ACTIVE" },
                  { label: "Inactive", value: "INACTIVE" },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {formMode === "create" ? "Create" : "Update"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
