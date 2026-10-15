# 碧霞仙子手臂、手指绑定

`princess-arm-rig.blend` 是可编辑源文件；网站只下载 `public/models/princess-agent-web-v4.glb`（约 1.2 MB），服务器不运行 Blender。

打开源文件后使用 `PrincessRig`，其控制分为 Body、Arms and sleeves、Fingers、Grip controls 四组。`PrincessRig_Baked` 是隐藏的网页导出骨架，保留它供检查，日常编辑使用前一个骨架。

- 49 根骨骼：原身体 3 根，左右锁骨/上臂/前臂/手掌/衣袖共 10 根，手指 30 根，如意 1 根，以及 5 根握持/腕部/肘部控制骨。
- 双手共十条三段骨骼链，拇指链包含掌骨段，均有真实顶点权重；肩部通过锁骨骨架带动上臂。
- `Control_Grip` 统筹双手与如意，前臂使用两段 IK，手掌保持持物朝向。手指只在原握持姿势上小幅弯曲。
- `Bow_Editable_IK` 为作者动作，30 fps、0–144 帧。0 帧待机，24 帧完成抬手，57–78 帧躬身停留，111 帧回正，144 帧落手复位。隐藏导出骨架含 Idle / Nod / Bow / LookAround / Talk 五段烘焙动画。远望为 5.4 秒：躯干转向约 8°、头部再转约 25°、抬头约 4°，停留后回正；使用水平转轴，避免歪头。

此绑定针对现有双手持如意的网格与作揖范围。原网格的手、袖口和道具局部连在一起；大幅张掌、换持物等新姿态仍应先调整局部拓扑和权重。

## 重建

在仓库根目录，用 Blender 4.5 LTS 运行：

```sh
Blender --background --python-exit-code 1 --python character/build_princess_rig.py
npx --yes @gltf-transform/cli@4.5.1 optimize taishan/runtime/arm-rig/princess-arms-raw.glb public/models/princess-agent-web-v4.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --flatten false --join false --palette false --instance false
npm test
npm run build
```

脚本从未改动的 `public/models/princess-agent.glb` 导入，保留 UV、贴图、口型和眨眼形变；添加骨骼、绘制权重、处理 UV 接缝并限制每顶点最多四个骨骼影响。作者骨架保留约束，网页骨架烘焙为普通关键帧，前端不再额外放大角度。首次重建会生成约 14 MB 的 `.blend` 和临时未压缩 GLB；临时文件位于忽略的 `taishan/runtime/arm-rig/`。

测试会实际解码网页模型，逐个验证 30 个手指关节能够改变顶点，检查双手与如意的相对位置、抬手先于躬身、结束复位以及原有口型。
