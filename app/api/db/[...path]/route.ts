import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // 相关 路径 读取
    const filePath = params.path.join("/")

    // 实际 文件 路径 相关
    const fullPath = path.join(process.cwd(), "public", "db", filePath)

    // 文件 相关 相关 检查
    if (!fs.existsSync(fullPath)) {
      return new NextResponse(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // 文件 相关
    const fileContent = fs.readFileSync(fullPath, "utf8")

    // JSON 解析 尝试
    try {
      const jsonData = JSON.parse(fileContent)
      return NextResponse.json(jsonData)
    } catch (e) {
      // JSON 相关 相关 相关 返回
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "text/plain",
        },
      })
    }
  } catch (error) {
    console.error("Error reading file:", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

