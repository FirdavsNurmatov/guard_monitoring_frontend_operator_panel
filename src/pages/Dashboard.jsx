import { useEffect, useRef, useState } from "react";
import { Typography, Spin, message, Table, Button, Modal } from "antd";
import { instance } from "../config/axios-instance";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { socket } from "../config/socket";
import toast from "react-hot-toast";

const { Title } = Typography;

export default function Dashboard() {
  const { mapId } = useParams();
  const baseUrl = import.meta.env.VITE_SERVER_PORT;

  const [selectedMap, setSelectedMap] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(true);
  const [guards, setGuards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showTables, setShowTables] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore((store) => store);

  const [now, setNow] = useState(new Date());

  const getFirstMap = async () => {
    const resFirst = await instance.get(`/admin/first-object`);
    return resFirst?.data?.id;
  };

  const handleSelectMap = async (id) => {
    try {
      const res = await instance.get(`/admin/object/${id}`);
      const { data } = await instance.get("/admin/checkpoints");

      const m = {
        ...res.data,
        checkpoints: data?.res,
        imageUrl: `${baseUrl}${res.data.imageUrl}`,
      };

      setSelectedMap(m);
    } catch (err) {
      toast.error("Mapni yuklab bo‘lmadi");
    } finally {
      setLoadingSelected(false);
    }
  };

  const fetchInitialLogs = async () => {
    try {
      const quantity = selectedMap?.checkpoints.length;

      const res = await instance.get(`/admin/logs?limit=${quantity || 10}`); // 🔹 API'da limitni qo‘yib olish kerak
      const data = res?.data?.data || [];

      const formattedLogs = data.map((log) => ({
        id: log.id,
        guard: log.user?.login || "Unknown",
        checkpoint: log.checkpoint?.name || "-",
        status: log.status,
        createdAt: new Date(log.createdAt).toLocaleTimeString(),
        createdAtRaw: new Date(log.createdAt),
        zoneId: log.checkpoint?.id,
        userId: log.userId,
        xPercent: log.checkpoint?.xPercent,
        yPercent: log.checkpoint?.yPercent,
      }));

      setLogs(formattedLogs);

      // 🔹 Guards ni ham logsdan yig‘ib olish
      const formattedGuards = [];
      data.forEach((log) => {
        if (!log.userId) return;

        const exists = formattedGuards.find((g) => g.guardId === log.userId);
        if (!exists) {
          formattedGuards.push({
            guardId: log.userId,
            login: log.user?.login,
            username: log.user?.username,
            xPercent: log.checkpoint?.xPercent,
            yPercent: log.checkpoint?.yPercent,
            checkpointName: log.checkpoint?.name,
            status: log.status,
            zoneId: log.checkpoint?.id,
          });
        }
      });

      setGuards(formattedGuards);
    } catch (err) {
      toast.error("Dastlabki loglarni olishda xatolik");
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await getFirstMap();

      if (!id) {
        setLoadingSelected(false);
        toast.error("Ma'lumot topilmadi yoki hali yaratilmagan");
        return;
      }

      await handleSelectMap(id);

      // ⏰ vaqtni update qilish
      const timer = setInterval(() => setNow(new Date()), 1000);

      let socketReceived = false;

      socket.on("logs", (log) => {
        socketReceived = true;

        const formattedLog = {
          id: log.id,
          guard: log.user?.username || "Unknown",
          checkpoint: log.checkpoint?.name || "-",
          status: log.status,
          createdAt: new Date(log.createdAt).toLocaleTimeString(),
          createdAtRaw: new Date(log.createdAt),
          zoneId: log.checkpoint?.id,
          userId: log.userId,
          xPercent: log.checkpoint?.xPercent,
          yPercent: log.checkpoint?.yPercent,
        };

        // logs update
        setLogs((prev) => {
          const newLogs = [formattedLog, ...prev];
          return newLogs.slice(0, 50);
        });

        // guards update
        setGuards((prev) => {
          const copy = [...prev];
          const index = copy.findIndex((g) => g.guardId === log.userId);
          if (index >= 0) {
            copy[index] = {
              guardId: log.userId,
              username: log.user?.username,
              xPercent: log.checkpoint?.xPercent,
              yPercent: log.checkpoint?.yPercent,
              checkpointName: log.checkpoint?.name,
              status: log.status,
              zoneId: log.checkpoint?.id,
            };
          } else {
            copy.push({
              guardId: log.userId,
              username: log.user?.username,
              xPercent: log.checkpoint?.xPercent,
              yPercent: log.checkpoint?.yPercent,
              checkpointName: log.checkpoint?.name,
              status: log.status,
              zoneId: log.checkpoint?.id,
            });
          }
          return copy;
        });
      });

      setTimeout(async () => {
        if (!socketReceived) {
          await fetchInitialLogs();
        }
      }, 1000);

      return () => {
        clearInterval(timer);
        socket.off("logs");
      };
    };

    init();
  }, []);

  const guardColumns = [
    { title: "Login", dataIndex: "login", key: "login" },
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Checkpoint", dataIndex: "checkpointName", key: "checkpointName" },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  const logColumns = [
    { title: "Guard login", dataIndex: "guard", key: "guard" },
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

  if (loadingSelected) {
    return (
      <div className="p-8">
        <Spin size="large" />
      </div>
    );
  }

  if (!selectedMap) {
    return (
      <>
        <div className="p-8 text-center text-gray-700">
          Ma'lumot topilmadi yoki hali yaratilmagan
        </div>
        {user && user.role && user.role == "ADMIN" && (
          <div className="text-center">
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Admin panel
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex items-center justify-between mx-20 py-4">
        <div className="flex gap-3 items-center">
          <Title level={3} className="!mb-0">
            {selectedMap.name}
          </Title>
          <div className="flex gap-1 items-center">
            {now.toLocaleTimeString("uz-UZ", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {user && user.role && user.role == "ADMIN" && (
            <div className="text-center">
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Admin panel
              </button>
            </div>
          )}
        </div>
        <Button onClick={() => setShowTables(true)}>Show Details</Button>
        <Modal
          title="Map Details"
          open={showTables}
          onCancel={() => setShowTables(false)}
          footer={null}
          width="90vw"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <Title level={4}>Latest Logs</Title>
              <Table
                dataSource={logs.map((l, index) => ({ ...l, key: index }))}
                columns={logColumns}
                pagination={false}
                scroll={{ y: 400, x: true }}
              />
            </div>
            <div className="border rounded-xl p-4">
              <Title level={4}>Guards</Title>
              <Table
                dataSource={guards.map((g, index) => ({
                  ...g,
                  key: index,
                }))}
                columns={guardColumns}
                pagination={false}
                scroll={{ y: 200, x: true }}
              />
            </div>
          </div>
        </Modal>
      </div>

      <div className="relative h-11/12 w-11/12 border rounded-xl overflow-hidden m-auto">
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
            const diffSec = Math.floor((now - latestLog.createdAtRaw) / 1000);

            let totalTime = 0;
            if (latestLog.status === "ON_TIME") {
              totalTime = (cp.normal_time || 0) * 60;
            } else if (latestLog.status === "LATE") {
              totalTime = (cp.pass_time || 0) * 60;
            }

            const remain = Math.max(totalTime - diffSec, 0);

            if (remain > 0) {
              const minutes = String(Math.floor(remain / 60)).padStart(2, "0");
              const seconds = String(remain % 60).padStart(2, "0");
              timeDiff = `${minutes}:${seconds}`;
            }
          }

          return (
            <div
              key={cp.id}
              className="absolute flex flex-col items-center"
              style={{
                top: `${cp.position.yPercent}%`,
                left: `${cp.position.xPercent}%`,
              }}
            >
              <div className="bg-white rounded-lg border px-1 py-1 flex items-center gap-1 shadow">
                <div className={`w-6 h-6 rounded-full ${statusColor}`} />
                <div className="text-xs">
                  {latestLog ? (
                    <>
                      {cp.name}
                      <br />
                      <span className="font-medium">{latestLog.guard}</span>
                      <br />
                      <span>
                        {new Date(latestLog.createdAtRaw).toLocaleString(
                          "uz-UZ",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </>
                  ) : (
                    <>{cp.name}</>
                  )}
                </div>
              </div>

              {timeDiff && (
                <div className="bg-white rounded-b-lg px-1">
                  <span className="text-blue-600 font-semibold">
                    {timeDiff}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
