import type { SystemId } from './systems';

export interface Choice {
  label: string;
  description: string;
  scores: Partial<Record<SystemId, number>>;
}

export interface Question {
  id: number;
  title: string;
  subtitle: string;
  choices: Choice[];
}

export const questions: Question[] = [
  {
    id: 1,
    title: '理想の間取りは、開放的？それとも独立的？',
    subtitle: '吹き抜け・リビング階段・オープンキッチンなど、空間のつながりについて',
    choices: [
      {
        label: '開放的な間取りに憧れる',
        description: '吹き抜けやリビング階段で、家全体がひとつの大きな空間のように暮らしたい',
        scores: { zenkan: 2, smart: 2 },
      },
      {
        label: 'ほどよく開放感がほしい',
        description: 'LDKは広くしたいが、寝室や子供部屋はしっかり独立させたい',
        scores: { smart: 2, myroom: 1 },
      },
      {
        label: '各部屋の独立性を重視',
        description: '部屋ごとにドアで仕切り、それぞれのプライベート空間を大切にしたい',
        scores: { myroom: 2 },
      },
    ],
  },
  {
    id: 2,
    title: '冬の朝、廊下や洗面所の寒さをどう感じますか？',
    subtitle: 'ヒートショックのリスクや、非居室の温度差について',
    choices: [
      {
        label: '家中どこでも暖かくないと嫌',
        description: '真冬でもトイレ・脱衣所・廊下が寒くないのは絶対条件。ヒートショックも心配',
        scores: { zenkan: 2, smart: 2 },
      },
      {
        label: '多少の温度差は許容できる',
        description: '居室が暖かければ、廊下やトイレは少し寒くても我慢できる',
        scores: { myroom: 2, smart: 1 },
      },
      {
        label: 'あまり気にしたことがない',
        description: '暖房は必要な部屋だけつければ十分だと思う',
        scores: { myroom: 2 },
      },
    ],
  },
  {
    id: 3,
    title: 'ご家族で、暑がり・寒がりの差は大きいですか？',
    subtitle: '家族間での体感温度の違いについて',
    choices: [
      {
        label: 'かなり違う。よくエアコンの設定でもめる',
        description: '夫はキンキンに冷やしたいが、妻は冷え性。子供も暑がりで調整が大変',
        scores: { myroom: 3 },
      },
      {
        label: '多少違うが、そこまで困っていない',
        description: '好みの差はあるが、大きなストレスにはなっていない',
        scores: { smart: 2, zenkan: 1 },
      },
      {
        label: 'ほぼ同じ。家全体が快適なら問題ない',
        description: '家族の体感温度は似ていて、全体的に快適ならそれでいい',
        scores: { zenkan: 2, smart: 2 },
      },
    ],
  },
  {
    id: 4,
    title: '10〜15年後、エアコンの寿命が来たときのことを考えると？',
    subtitle: '将来の交換費用と選択肢について',
    choices: [
      {
        label: 'そのとき最新・最安の市販品を自由に選びたい',
        description: '家電量販店で型落ちの掘り出し物を見つけたり、最新の省エネ機種を選びたい',
        scores: { smart: 2, myroom: 2 },
      },
      {
        label: '多少高くても性能が良ければ構わない',
        description: '選択肢が限られても、信頼できるメーカーの製品なら気にしない',
        scores: { zenkan: 1, smart: 1 },
      },
      {
        label: 'あまり考えたことがない',
        description: 'そのときにならないとわからないので、今は気にしていない',
        scores: { zenkan: 1 },
      },
    ],
  },
  {
    id: 5,
    title: '真冬や真夏に、万が一エアコンが故障したら？',
    subtitle: '長野の過酷な気候での故障リスクについて',
    choices: [
      {
        label: '他の部屋で凌げる安心感がほしい',
        description: '1台壊れても残りで暮らせる。全滅は絶対に避けたい',
        scores: { myroom: 2, smart: 1 },
      },
      {
        label: '最低限のバックアップがあれば安心',
        description: '2台あれば片方が壊れても半分は動く。完全停止さえなければOK',
        scores: { smart: 3 },
      },
      {
        label: '滅多に壊れないなら一元管理でいい',
        description: '故障の確率は低いので、普段の快適さを優先したい',
        scores: { zenkan: 2 },
      },
    ],
  },
];
