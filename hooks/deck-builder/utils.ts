import type { Database, Skill } from "../../types"
import type { CardSource, SelectedCard, EquipmentSlot } from "./types"

// 角色 ID相关 角色 信息 读取
export function getCharacterById(data: Database | null, id: number) {
  if (!data || id === -1) return null
  return data.characters[id.toString()]
}

// 卡牌 ID相关 卡牌 信息 读取
export function getCardById(data: Database | null, id: string) {
  if (!data) return null
  return data.cards[id]
}

// 技能 ID相关 技能 信息 读取
export function getSkillById(data: Database | null, skillId: number): Skill | null {
  if (!data) return null
  return data.skills[skillId.toString()] || null
}

// 装备 ID相关 装备 信息 读取
export function getEquipmentById(data: Database | null, equipId: string) {
  if (!data || !data.equipments) return null
  return data.equipments[equipId] || null
}

// 卡牌 来源 比较 函数
export function isSameSource(source1: CardSource, source2: CardSource): boolean {
  if (source1.type !== source2.type) return false
  if (source1.id !== source2.id) return false
  if (source1.skillId !== source2.skillId) return false
  if (source1.slotIndex !== source2.slotIndex) return false

  if (source1.type === "equipment" && source2.type === "equipment") {
    return source1.equipType === source2.equipType
  }

  return true
}

// 卡牌相关 相关 来源 存在相关 检查
export function hasSource(card: SelectedCard, source: CardSource): boolean {
  return card.sources.some((s) => isSameSource(s, source))
}

// 卡牌 ID 有效相关 检查
export function isValidCardId(data: Database | null, cardId: string): boolean {
  if (!data) return false
  return !!data.cards[cardId]
}

// getAvailableCardIds 函数 修改
interface CardWithSource {
  cardId: string;
  source: CardSource;
}

// 修改相关 getAvailableCardIds 函数
export function getAvailableCardIds(
  data: Database | null,
  selectedCharacters: number[],
  equipment: EquipmentSlot[],
): { idSet: Set<string>, cardSources: CardWithSource[] } {
  const availableCardIds = new Set<string>();
  const cardSources: CardWithSource[] = [];

  if (!data) return { idSet: availableCardIds, cardSources };

  // 选择相关 角色的 技能相关 卡牌 ID 相关
  const validCharacters = selectedCharacters.filter((id) => id !== -1);

  // 相关 角色的 技能 相关 卡牌 ID 查找
  validCharacters.forEach((charId, slotIndex) => {
    const charSkillMap = data.charSkillMap?.[charId.toString()];
    if (!charSkillMap) return;

    // 新的 相关: skills 数组 处理
    if (charSkillMap.skills) {
      charSkillMap.skills.forEach((skillId: number) => {
        const skill = data.skills[skillId.toString()];
        if (skill && skill.cardID) {
          const cardId = skill.cardID.toString();
          availableCardIds.add(cardId);
          
          // 来源 信息 添加
          cardSources.push({
            cardId,
            source: {
              type: "character",
              id: charId,
              skillId,
              slotIndex,
            }
          });
        }
      });
    }

    // 其他 数组相关(relatedSkills, notFromCharacters)相关 相关 处理
    // ...
  });

  // 装备相关 卡牌 ID 相关 - item_skill_map.json 使用
  validCharacters.forEach((charId, slotIndex) => {
    const charEquipment = equipment[slotIndex];

    // 相关 装备 类型相关 处理
    const processEquipment = (equipId: string | null, equipType: "weapon" | "armor" | "accessory") => {
      if (!equipId) return;

      // item_skill_map.json相关 装备 ID相关 对应相关 技能 相关 查找
      const itemSkillMap = data.itemSkillMap?.[equipId];
      if (!itemSkillMap) return;

      // relatedSkills 数组 处理
      if (itemSkillMap.relatedSkills) {
        itemSkillMap.relatedSkills.forEach((skillId: number) => {
          const skill = data.skills[skillId.toString()];
          if (skill && skill.cardID) {
            const cardId = skill.cardID.toString();
            availableCardIds.add(cardId);
            
            // 来源 信息 添加
            cardSources.push({
              cardId,
              source: {
                type: "equipment",
                id: equipId,
                skillId,
                slotIndex,
                equipType,
              }
            });
          }
        });
      }
    };

    // 相关 装备 类型相关 相关 处理
    if (charEquipment.weapon) processEquipment(charEquipment.weapon, "weapon");
    if (charEquipment.armor) processEquipment(charEquipment.armor, "armor");
    if (charEquipment.accessory) processEquipment(charEquipment.accessory, "accessory");
  });

  return { idSet: availableCardIds, cardSources };
}
