import React, { useEffect, useState } from "react";
import { Typography, Spin, Table, Button, Modal, Select } from "antd";
import { instance } from "../config/axios-instance";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { socket } from "../config/socket";
import toast from "react-hot-toast";
import Noty from "noty";
import "noty/lib/noty.css";
import "noty/src/themes/metroui.scss";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// default icon to fix missing marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const { Title } = Typography;
const { Option } = Select;

export default function Dashboard() {
  const [maps, setMaps] = useState([]); // 🔹 barcha obyektlar
  const [selectedMap, setSelectedMap] = useState(null); // 🔹 tanlangan obyekt
  const [loading, setLoading] = useState(true);
  const [guards, setGuards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showTables, setShowTables] = useState(false);
  const [now, setNow] = useState(new Date());
  const [gpsPoints, setGpsPoints] = useState([]);
  const [mapType, setMapType] = useState("y"); // 🗺️ default: hybrid

  const baseUrl = import.meta.env.VITE_SERVER_PORT;
  const navigate = useNavigate();
  const { user } = useAuthStore((store) => store);

  // 🟢 Barcha obyektlarni olish
  const fetchAllMaps = async () => {
    try {
      const res = await instance.get("/admin/objects");
      setMaps(res.data || []);
    } catch (err) {
      toast.error("Obyektlar ro‘yxatini yuklab bo‘lmadi 😞");
    }
  };

  // 🟢 Tanlangan obyektni yuklash
  const handleSelectMap = async (id) => {
    setLoading(true);
    try {
      const res = await instance.get(`/admin/object/${id}`);
      const { data } = await instance.get(`/admin/checkpoints?objectId=${id}`);

      const m = {
        ...res.data,
        checkpoints: data?.res || [],
        imageUrl: `${baseUrl}${res.data.imageUrl}`,
      };

      setSelectedMap(m);
      await fetchInitialLogs(id);
    } catch (err) {
      toast.error("Obyekt ma'lumotlarini yuklab bo‘lmadi 😕");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Loglarni olish
  const fetchInitialLogs = async (objectId) => {
    try {
      const res = await instance.get(
        `/admin/logs?objectId=${objectId}&limit=10`
      );
      const data = res?.data?.data || [];

      const formattedLogs = data.map((log) => ({
        id: log.id,
        guard: log.user?.username || "Noma'lum",
        checkpoint: log.checkpoint?.name || "-",
        status: log.status,
        createdAt: new Date(log.createdAt).toLocaleTimeString(),
        createdAtRaw: new Date(log.createdAt),
        zoneId: log.checkpoint?.id,
        userId: log.userId,
      }));

      setLogs(formattedLogs);

      const guardsArr = [];
      data.forEach((log) => {
        if (!log.userId) return;
        if (!guardsArr.some((g) => g.guardId === log.userId)) {
          guardsArr.push({
            guardId: log.userId,
            login: log.user?.login,
            username: log.user?.username,
            checkpointName: log.checkpoint?.name,
            status: log.status,
          });
        }
      });

      setGuards(guardsArr);
    } catch {
      toast.error("Loglarni olishda xatolik yuz berdi ⚠️");
    }
  };

  // 🧠 INIT EFFECT
  useEffect(() => {
    const init = async () => {
      await fetchAllMaps();
    };

    init();
  }, []); // 🟢 faqat bir marta ishlaydi (mount paytida)

  useEffect(() => {
    if (maps.length > 0 && !selectedMap) {
      handleSelectMap(maps[0].id);
    }
  }, [maps]); // 🟢 faqat maps yangilansa, lekin fetch ichida emas

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // 🕒 vaqt yangilanishi mustaqil effect

  useEffect(() => {
    // 🧠 Socketdan real-time loglarni olish (faqat bir marta)
    const handleLog = (log) => {
      // Agar tanlangan obyekt bo‘lsa, va log shu obyektga tegishli bo‘lsa:
      if (!selectedMap || log?.checkpoint.objectId !== selectedMap.id) return;

      const formattedLog = {
        id: log.id,
        guard: log.user?.username || "Noma'lum",
        checkpoint: log.checkpoint?.name || "-",
        status: log.status,
        createdAt: new Date(log.createdAt).toLocaleTimeString(),
        createdAtRaw: new Date(log.createdAt),
        zoneId: log.checkpoint?.id,
        userId: log.userId,
        xPercent: log.checkpoint?.xPercent,
        yPercent: log.checkpoint?.yPercent,
      };

      if (
        formattedLog.status === "ON_TIME" ||
        formattedLog.status === "MISSED"
      ) {
        // 🔊 audio va noty xabarnoma
        const audio = new Audio("/sound-example.wav");
        audio.play().catch(() => {});

        new Noty({
          text: `<b>${formattedLog.guard}</b> - ${formattedLog.checkpoint}`,
          type: formattedLog.status === "ON_TIME" ? "success" : "error",
          layout: "topRight",
          timeout: 4000,
        }).show();
      }

      // 🧩 logs update
      setLogs((prev) => [formattedLog, ...prev].slice(0, 50));

      // 🧩 guards update
      setGuards((prev) => {
        const index = prev.findIndex((g) => g.guardId === log.userId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            checkpointName: log.checkpoint?.name,
            status: log.status,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              guardId: log.userId,
              login: log.user?.username,
              username: log.user?.username,
              checkpointName: log.checkpoint?.name,
              status: log.status,
            },
          ];
        }
      });
    };

    socket.on("logs", handleLog);

    return () => {
      socket.off("logs", handleLog);
    };
  }, [selectedMap?.id]); // 🧩 faqat obyekt o‘zgarganda yangilanadi

  // 🟢 selectedMap o‘zgarganda socket room’ga qo‘shiladi
  useEffect(() => {
    if (!selectedMap?.id) return;

    socket.emit("join", selectedMap.id);

    return () => {
      socket.emit("leave", selectedMap.id);
    };
  }, [selectedMap?.id]);

  // 🛰️ GPS real-time yangilanishlar
  useEffect(() => {
    const handleGps = async (msg) => {
      // Masalan: msg = "gps:3"
      if (!msg.startsWith("gps:")) return;

      const userId = msg.split(":")[1];
      try {
        const res = await instance.get(`/admin/gps/${userId}?limit=20`);
        const points = res.data.map((p) => [p.location.lat, p.location.lng]);
        setGpsPoints(points);
      } catch (err) {
        toast.error("GPS ma’lumotlarini yuklab bo‘lmadi 📡");
      }
    };

    socket.on("gps", handleGps);

    return () => {
      socket.off("gps", handleGps);
    };
  }, []);

  const guardColumns = [
    { title: "Login", dataIndex: "login", key: "login" },
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Checkpoint", dataIndex: "checkpointName", key: "checkpointName" },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  const logColumns = [
    { title: "Guard", dataIndex: "guard", key: "guard" },
    { title: "Checkpoint", dataIndex: "checkpoint", key: "checkpoint" },
    { title: "Status", dataIndex: "status", key: "status" },
    {
      title: "Time",
      dataIndex: "createdAtRaw",
      render: (time) =>
        new Date(time).toLocaleTimeString("uz-UZ", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      key: "createdAt",
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="mb-1 flex items-center justify-between px-10 py-4 bg-white border-b shadow-sm">
        <div className="flex gap-3 items-center">
          <Title level={3} className="!mb-0">
            {selectedMap ? selectedMap.name : "Obyekt tanlanmagan"}
          </Title>
          <span className="text-black">
            {now.toLocaleTimeString("uz-UZ", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            placeholder="Obyektni tanlang"
            style={{ width: 200 }}
            onChange={(id) => handleSelectMap(id)}
            value={selectedMap?.id}
          >
            {maps.map((m) => (
              <Option key={m.id} value={m.id}>
                {m.name}
              </Option>
            ))}
          </Select>
          <Button type="primary" onClick={() => setShowTables(true)}>
            Tafsilotlar
          </Button>
          {user?.role === "ADMIN" && (
            <Button onClick={() => navigate("/admin")}>Admin Panel</Button>
          )}
        </div>
      </div>

      {/* LOADING / EMPTY */}
      {loading && (
        <div className="h-[80vh] flex items-center justify-center">
          <Spin size="large" />
        </div>
      )}

      {!loading && selectedMap && (
        <>
          {selectedMap && (
            <div className="relative h-11/12 w-11/12 border rounded-xl overflow-hidden m-auto">
              {selectedMap.type === "IMAGE" ? (
                <>
                  <img
                    src={selectedMap.imageUrl}
                    alt={selectedMap.name}
                    className="h-full w-full"
                  />

                  {selectedMap.checkpoints?.map((cp) => {
                    const latestLog = [...logs]
                      .filter((l) => l.zoneId === cp.id)
                      .sort((a, b) => b.createdAtRaw - a.createdAtRaw)[0];

                    const statusColors = {
                      ON_TIME: "bg-green-500",
                      LATE: "bg-yellow-500",
                      MISSED: "bg-red-500",
                    };
                    const statusColor = latestLog
                      ? statusColors[latestLog.status] || "bg-gray-400"
                      : "bg-gray-400";

                    let timeDiff = null;
                    if (latestLog) {
                      const now = Date.now();
                      const diffSec = Math.floor(
                        (now - latestLog.createdAtRaw) / 1000
                      );

                      let totalTime = 0;
                      if (latestLog.status === "ON_TIME") {
                        totalTime = (cp.normal_time || 0) * 60;
                      } else if (latestLog.status === "LATE") {
                        totalTime = (cp.pass_time || 0) * 60;
                      }

                      const remain = Math.max(totalTime - diffSec, 0);

                      if (remain > 0) {
                        const hours = Math.floor(remain / 3600);
                        const minutes = Math.floor((remain % 3600) / 60);
                        const seconds = remain % 60;

                        // faqat soat bo‘lsa ko‘rsatamiz
                        if (hours > 0) {
                          timeDiff = `${String(hours).padStart(
                            2,
                            "0"
                          )}:${String(minutes).padStart(2, "0")}:${String(
                            seconds
                          ).padStart(2, "0")}`;
                        } else {
                          timeDiff = `${String(minutes).padStart(
                            2,
                            "0"
                          )}:${String(seconds).padStart(2, "0")}`;
                        }
                      }
                    }

                    return (
                      <div
                        key={cp.id}
                        className="absolute flex flex-col items-center"
                        style={{
                          top: `${cp.position?.yPercent || 0}%`,
                          left: `${cp.position?.xPercent || 0}%`,
                        }}
                      >
                        <div
                          className={`bg-white rounded-lg border px-2 py-1 flex flex-col items-center gap-1 shadow`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full ${statusColor}`}
                          />
                          <div className="text-sm text-center">
                            <div>{cp.name}</div>
                            {latestLog && (
                              <div className="font-medium">
                                {latestLog.guard}
                              </div>
                            )}
                            {timeDiff && (
                              <div className="text-blue-600 font-semibold">
                                {timeDiff}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                selectedMap.type === "MAP" && (
                  <>
                    {/* 🧭 Xarita turi tanlash */}
                    <div
                      className="absolute top-3 left-15 z-[1000] bg-white rounded-md shadow-md p-2 flex items-center gap-2"
                      style={{ fontSize: "14px" }}
                    >
                      <span className="font-medium">Xarita turi:</span>
                      <Select
                        size="small"
                        value={mapType}
                        onChange={(val) => setMapType(val)}
                        style={{ width: 160 }}
                      >
                        <Option value="m">🛣️ Oddiy</Option>
                        <Option value="s">🛰️ Sun’iy yo‘ldosh</Option>
                        <Option value="y">🌍 Aralash</Option>
                        <Option value="p">⛰️ Relyef</Option>
                      </Select>
                    </div>

                    <MapContainer
                      center={selectedMap.position || [41, 61]}
                      zoom={selectedMap.zoom || 15}
                      scrollWheelZoom={true}
                      style={{ height: "100%", width: "100%" }}
                      attributionControl={false}
                    >
                      <TileLayer
                        url={`https://{s}.google.com/vt/lyrs=${mapType}&x={x}&y={y}&z={z}`}
                        subdomains={["mt0", "mt1", "mt2", "mt3"]}
                        attribution="© Google Maps"
                      />

                      {selectedMap.checkpoints?.map((cp) => {
                        if (!cp.location.lat || !cp.location.lng) return null;

                        const latestLog = [...logs]
                          .filter((l) => l.zoneId === cp.id)
                          .sort((a, b) => b.createdAtRaw - a.createdAtRaw)[0];

                        const statusColors = {
                          ON_TIME: "green",
                          LATE: "yellow",
                          MISSED: "red",
                        };
                        const color = latestLog
                          ? statusColors[latestLog.status]
                          : "gray";

                        let timeDiff = null;
                        if (latestLog) {
                          const now = Date.now();
                          const diffSec = Math.floor(
                            (now - latestLog.createdAtRaw) / 1000
                          );

                          let totalTime = 0;
                          if (latestLog.status === "ON_TIME") {
                            totalTime = (cp.normal_time || 0) * 60;
                          } else if (latestLog.status === "LATE") {
                            totalTime = (cp.pass_time || 0) * 60;
                          }

                          const remain = Math.max(totalTime - diffSec, 0);

                          if (remain > 0) {
                            const hours = Math.floor(remain / 3600);
                            const minutes = Math.floor((remain % 3600) / 60);
                            const seconds = remain % 60;

                            // faqat soat bo‘lsa ko‘rsatamiz
                            if (hours > 0) {
                              timeDiff = `${String(hours).padStart(
                                2,
                                "0"
                              )}:${String(minutes).padStart(2, "0")}:${String(
                                seconds
                              ).padStart(2, "0")}`;
                            } else {
                              timeDiff = `${String(minutes).padStart(
                                2,
                                "0"
                              )}:${String(seconds).padStart(2, "0")}`;
                            }
                          }
                        }

                        return (
                          <React.Fragment key={cp.id}>
                            <Marker
                              key={cp.id}
                              position={[cp.location.lat, cp.location.lng]}
                              icon={L.divIcon({
                                className: "",
                                html: `<div style="
                                  background:${color};
                                  width:16px;
                                  height:16px;
                                  border-radius:50%;
                                  border:2px solid white;
                                  display:flex;
                                  align-items:center;
                                  justify-content:center;">
                                </div>`,
                              })}
                            >
                              <Tooltip
                                direction="top"
                                offset={[0, -10]}
                                permanent
                              >
                                <div className="text-sm text-center">
                                  <strong>{cp.name}</strong>
                                  {latestLog && (
                                    <>
                                      <br />
                                      {latestLog.guard}
                                    </>
                                  )}
                                  {timeDiff && (
                                    <div className="text-blue-600 font-semibold">
                                      {timeDiff}
                                    </div>
                                  )}
                                </div>
                              </Tooltip>
                            </Marker>
                            {gpsPoints.length > 0 && (
                              <>
                                <Polyline
                                  positions={gpsPoints}
                                  color="blue"
                                  weight={4}
                                />
                                {/* 🔹 So‘nggi nuqtada kichik yashil doira */}
                                <Marker
                                  position={gpsPoints[gpsPoints.length - 1]}
                                  icon={L.divIcon({
                                    className: "",
                                    html: `<div style="
                                      width:10px;
                                      height:10px;
                                      background-color:green;
                                      border:2px solid black;
                                      border-radius:50%;
                                    "></div>`,
                                  })}
                                />
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </MapContainer>
                  </>
                )
              )}
            </div>
          )}

          {/* MODAL */}
          <Modal
            title="Tafsilotlar"
            open={showTables}
            onCancel={() => setShowTables(false)}
            footer={null}
            width="90vw"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <Title level={4}>So‘nggi Loglar</Title>
                <Table
                  dataSource={logs.map((l, i) => ({ ...l, key: i }))}
                  columns={logColumns}
                  pagination={false}
                  scroll={{ y: 400 }}
                />
              </div>
              <div className="border rounded-xl p-4">
                <Title level={4}>Xodimlar</Title>
                <Table
                  dataSource={guards.map((g, i) => ({ ...g, key: i }))}
                  columns={guardColumns}
                  pagination={false}
                  scroll={{ y: 400 }}
                />
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
