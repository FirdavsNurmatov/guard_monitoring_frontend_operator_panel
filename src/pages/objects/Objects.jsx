import { useEffect, useState } from "react";
import {
  Button,
  Upload,
  Input,
  InputNumber,
  message,
  Modal,
  Table,
  Space,
  Popconfirm,
  notification,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { instance } from "../../config/axios-instance";

const Objects = () => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [objectId, setObjectId] = useState(null);
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [objectName, setObjectName] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchObjects = async () => {
    try {
      const res = await instance.get("/admin/objects");
      setObjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckpoints = async (id, type) => {
    try {
      const objectRes = await instance.get(`/admin/object/${id}`);
      setObjectId(objectRes?.data?.id);
      setObjectName(objectRes?.data?.name);
      setImage(
        `${import.meta.env.VITE_SERVER_PORT}${objectRes?.data?.imageUrl}`
      );

      const res = await instance.get(`/admin/checkpoints`);
      setCheckpoints(res.data.res || []);

      if (type === "view") setIsViewModalOpen(true);
      if (type === "edit") setIsEditModalOpen(true);
    } catch (err) {
      console.error(err?.response?.data);
      message.error("Failed to fetch map details ❌");
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setObjectName("");
    setImage(null);
    setObjectId(null);
    setCheckpoints([]);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setObjectName("");
    setImage(null);
    setObjectId(null);
    setCheckpoints([]);
  };

  // 🚀 Faqat preview qilish (serverga yubormaydi)
  const handleMapUpload = (info) => {
    const selectedFile = info.file.originFileObj || info.file;
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
    reader.readAsDataURL(selectedFile);

    setFile(selectedFile);

    setObjectId(null);
    setCheckpoints([]);
  };

  const handleSubmit = async () => {
    try {
      const cardNumbers = checkpoints
        .map((cp) => cp.card_number)
        .filter(Boolean);
      const duplicates = cardNumbers.filter(
        (cn, idx) => cardNumbers.indexOf(cn) !== idx
      );

      if (duplicates.length > 0) {
        notification.warning({
          message: "Duplicate Card Number",
          description: `❌ Bu card_number allaqachon mavjud: ${duplicates[0]}`,
          placement: "topRight", // ekranning qayerida chiqishini belgilash mumkin
        });
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", objectName || `Map-${Date.now()}`);

      const res = await instance.post("/admin/object", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      for (const cp of checkpoints) {
        await instance.post("/admin/checkpoints", cp);
      }

      message.success("Map created successfully ✅");
      fetchObjects();
      setIsCreateModalOpen(false);
    } catch (err) {
      notification.error({
        message: "Xatolik",
        description: "❌ Failed to create map",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await instance.delete(`/admin/object/${id}`);
      message.success("Map deleted ✅");
      fetchObjects();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete map ❌");
    }
  };

  const handleUpdate = async () => {
    try {
      await instance.patch(`/admin/object/${objectId}`, { name: objectName });

      for (const cp of checkpoints) {
        if (cp.id) {
          const { id, createdAt, updatedAt, ...data } = cp;
          await instance.patch(`/admin/checkpoints/${cp.id}`, data);
        } else {
          await instance.post("/admin/checkpoints", cp);
        }
      }

      message.success("Map updated ✅");
      setIsEditModalOpen(false);
      fetchObjects();
    } catch (err) {
      console.error(err?.response?.data);
      message.error("Failed to update map ❌");
    }
  };

  const handleImageClick = (e) => {
    if (!image) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCheckpoints([
      ...checkpoints,
      {
        name: "",
        normal_time: 15,
        pass_time: 2,
        position: {
          xPercent: +x.toFixed(2),
          yPercent: +y.toFixed(2),
        },
      },
    ]);
  };

  const handleChange = (index, field, value) => {
    const newCheckpoints = [...checkpoints];
    newCheckpoints[index][field] = value;
    setCheckpoints(newCheckpoints);
  };

  const handleDeleteCheckpoint = async (id) => {
    try {
      await instance.delete(`/admin/checkpoints/${id}`);
      message.success("Checkpoint deleted ✅");
      setCheckpoints(checkpoints.filter((cp) => cp.id !== id));
    } catch (err) {
      console.error(err?.response?.data);
      message.error("Failed to delete checkpoint ❌");
    }
  };

  const columns = [
    {
      title: "Image",
      render: (_, record) => (
        <img
          src={`${import.meta.env.VITE_SERVER_PORT}${record?.imageUrl}`}
          alt="zone image"
          className="max-w-16"
        />
      ),
    },
    { title: "Name", dataIndex: "name" },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button onClick={() => fetchCheckpoints(record.id, "view")}>
            View
          </Button>
          <Button
            type="primary"
            onClick={() => fetchCheckpoints(record.id, "edit")}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this map?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        {objects?.length == 0 && (
          <Button
            type="primary"
            onClick={() => (setIsCreateModalOpen(true), openCreateModal())}
          >
            Create Map
          </Button>
        )}
      </div>

      <Table
        dataSource={objects}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      {/* CREATE MODAL */}
      <Modal
        open={isCreateModalOpen}
        onCancel={handleCloseCreateModal}
        footer={null}
        width={1200}
        title="Create New Map"
      >
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Map name"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
          />

          <Upload
            accept="image/*"
            beforeUpload={() => false}
            onChange={handleMapUpload}
            maxCount={1}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Upload Map</Button>
          </Upload>
        </div>

        {image && (
          <div
            className="relative inline-block border rounded-xl shadow-md cursor-crosshair mt-4"
            onClick={handleImageClick}
          >
            <img
              src={image}
              alt="map"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {checkpoints?.map((point, index) => (
              <div
                key={index}
                className="absolute flex"
                style={{
                  top: `${point.position.yPercent}%`,
                  left: `${point.position.xPercent}%`,
                }}
              >
                <div className="w-4 h-4 z-10 bg-green-500 rounded-full border-2 border-white shadow" />
                <span className="max-w-[100px] text-xs bg-white px-1 rounded shadow">
                  {point.name || `CP-${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {checkpoints.length > 0 && (
          <div className="mt-4 space-y-2">
            {checkpoints.map((cp, i) => (
              <div
                key={i}
                className="flex gap-3 items-center border p-2 rounded"
              >
                <Input
                  placeholder="Checkpoint name"
                  value={cp.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  style={{ width: "300px" }}
                />

                <InputNumber
                  min={1}
                  value={cp.normal_time}
                  onChange={(val) => handleChange(i, "normal_time", val)}
                  addonAfter="min"
                  style={{ width: "200px" }}
                />

                <InputNumber
                  min={1}
                  value={cp.pass_time}
                  onChange={(val) => handleChange(i, "pass_time", val)}
                  addonAfter="min"
                  style={{ width: "200px" }}
                />

                <Input
                  placeholder="Card number"
                  value={cp.card_number}
                  onChange={(e) =>
                    handleChange(i, "card_number", e.target.value)
                  }
                  style={{ width: "250px" }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button type="primary" onClick={handleSubmit}>
            Create
          </Button>
          <Button onClick={handleCloseCreateModal}>Cancel</Button>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={1200}
        title={`View Map: ${objectName}`}
      >
        {image && (
          <div className="relative inline-block border rounded-xl shadow-md">
            <img
              src={image}
              alt="map"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {checkpoints.map((point, index) => (
              <div
                key={index}
                className="absolute flex"
                style={{
                  top: `${point.position.yPercent}%`,
                  left: `${point.position.xPercent}%`,
                }}
              >
                <div className="w-4 h-4 z-10 bg-blue-500 rounded-full border-2 border-white shadow" />
                <span className="mt-1 text-xs bg-white px-1 rounded shadow">
                  {point.name || `CP-${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={1200}
        title={`Edit Map: ${objectName}`}
      >
        <Input
          placeholder="Map name"
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
        />

        {image && (
          <div
            className="mt-4 relative inline-block border rounded-xl shadow-md cursor-crosshair"
            onClick={handleImageClick}
          >
            <img
              src={image}
              alt="map"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {checkpoints.map((point, index) => (
              <div
                key={index}
                className="absolute flex"
                style={{
                  top: `${point.position.yPercent}%`,
                  left: `${point.position.xPercent}%`,
                }}
              >
                <div className="w-4 h-4 z-10 bg-red-500 rounded-full border-2 border-white shadow" />
                <span className="mt-1 text-xs bg-white px-1 rounded shadow">
                  {point.name || `CP-${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {checkpoints.length > 0 && (
          <div className="mt-6 space-y-3">
            {checkpoints.map((cp, i) => (
              <div
                key={i}
                className="flex gap-4 items-center border p-2 rounded"
              >
                <Input
                  placeholder="Checkpoint name"
                  value={cp.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  style={{ width: "25%" }}
                />

                <InputNumber
                  min={1}
                  value={cp.normal_time}
                  onChange={(val) => handleChange(i, "normal_time", val)}
                  addonAfter="min"
                />

                <InputNumber
                  min={1}
                  value={cp.pass_time}
                  onChange={(val) => handleChange(i, "pass_time", val)}
                  addonAfter="min"
                />

                <Input
                  placeholder="Card number"
                  value={cp.card_number}
                  onChange={(e) =>
                    handleChange(i, "card_number", e.target.value)
                  }
                  style={{ width: "25%" }}
                />

                {cp.id && (
                  <Popconfirm
                    title="Delete this checkpoint?"
                    onConfirm={() => handleDeleteCheckpoint(cp.id)}
                  >
                    <Button danger size="small">
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button type="primary" onClick={handleUpdate}>
            Save Changes
          </Button>
          <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Objects;
