import { useEffect, useRef, useState } from "react";
import { Typography, Spin, message, Table, Button, Modal } from "antd";
import { instance } from "../config/axios-instance";
import { useParams } from "react-router-dom";

const { Title } = Typography;

export default function Dashboard() {
  const { mapId } = useParams();
  const baseUrl = import.meta.env.VITE_SERVER_PORT;

  const [selectedMap, setSelectedMap] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(true);
  const [guards, setGuards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showTables, setShowTables] = useState(false);

  const intervalRef = useRef(null);
  const [now, setNow] = useState(new Date()); // ⏱ hozirgi vaqt

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

      // Logs
      const limit = data?.length ? data.length : 10;

      const logRes = await instance.get(`/admin/logs/${id}?limit=${limit}`);
      const logsData = logRes.data?.data || [];
      const formattedLogs = logsData.map((log) => ({
        id: log.id,
        guard: log.user.username,
        checkpoint: log.checkpoint.name,
        status: log.status,
        createdAt: new Date(log.createdAt).toLocaleTimeString(),
        createdAtRaw: new Date(log.createdAt),
        zoneId: log.checkpoint.id,
        userId: log.userId,
        xPercent: log.checkpoint.xPercent,
        yPercent: log.checkpoint.yPercent,
      }));

      setLogs(formattedLogs);

      // Guards (oxirgi log bo‘yicha)
      const guardMap = new Map();
      formattedLogs
        .sort((a, b) => b.createdAtRaw - a.createdAtRaw)
        .forEach((log) => {
          if (!guardMap.has(log.userId)) {
            guardMap.set(log.userId, {
              guardId: log.userId,
              username: log.guard,
              xPercent: log.xPercent,
              yPercent: log.yPercent,
              checkpointName: log.checkpoint,
              status: log.status,
              zoneId: log.zoneId,
            });
          }
        });
      setGuards(Array.from(guardMap.values()));
    } catch (err) {
      console.error(err);
      message.error("Mapni yoki loglarni yuklab bo‘lmadi");
    } finally {
      setLoadingSelected(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await getFirstMap();

      if (!id) {
        setLoadingSelected(false);
        message.warning("Ma'lumot topilmadi");
        return;
      }

      let counter = 0;

      intervalRef.current = setInterval(() => {
        setNow(new Date()); // ⏱ soatni yangilash

        counter++;
        if (counter % 2 === 0) {
          handleSelectMap(id); // har 2 sekundda fetch
        }
      }, 1000);
    };

    init();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mapId]);

  const guardColumns = [
    { title: "Guard", dataIndex: "username", key: "username" },
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

  if (loadingSelected) {
    return (
      <div className="p-8">
        <Spin size="large" />
      </div>
    );
  }

  if (!selectedMap) {
    return (
      <div className="p-8 text-center text-gray-700">Ma'lumot topilmadi</div>
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
            {new Date().toLocaleTimeString("uz-UZ", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            <br />
          </div>
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
                dataSource={logs.map((l) => ({ ...l, key: l.id }))}
                columns={logColumns}
                pagination={false}
                scroll={{ y: 400, x: true }}
              />
            </div>
            <div className="border rounded-xl p-4">
              <Title level={4}>Guards</Title>
              <Table
                dataSource={guards.map((g) => ({ ...g, key: g.guardId }))}
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

          // ✅ Har bir checkpoint uchun alohida timer
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
