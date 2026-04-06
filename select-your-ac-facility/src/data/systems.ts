export type SystemId = 'myroom' | 'smart' | 'zenkan';

export interface AcSystem {
  id: SystemId;
  name: string;
  catch: string;
  subtitle: string;
  price: string;
  electricity: string;
  maintenance: string;
  lcc: string;
  description: string;
  bestFor: string[];
  worstFor: string[];
  features: string[];
  pros: string[];
  cons: string[];
  color: string;
  icon: string;
}

export const systems: Record<SystemId, AcSystem> = {
  myroom: {
    id: 'myroom',
    name: '個別空調',
    catch: '個人最適化と柔軟性',
    subtitle: '各部屋にエアコンを設置',
    price: '約90万円〜',
    electricity: '使う部屋だけ運転できるが、台数が多いと合計は高くなりがち',
    maintenance: '台数分の清掃・フィルター交換が必要。交換は家電量販店で自由に選べる',
    lcc: '高め（全台数の清掃・買替が必要）',
    description: '各部屋に個別のエアコンを設置する方式。ご家族それぞれが好みの温度で過ごせます。',
    bestFor: ['床下エアコン暖房によって、冬場でも輻射熱で<mark class="hl-green">足下から暖かく</mark>くらせる'],
    worstFor: [],
    features: [
      '各部屋に専用エアコン（3LDKで計4台）',
      '部屋ごとの個別温度設定が可能',
      '床下エアコン追加でヒートショック対策も対応',
      '将来、必要になった部屋に最新機種を後付け可能',
    ],
    pros: [
      '「子供が遊ぶ部屋は少し涼しく」「寝室は暖かく」など、<mark class="hl-green">部屋別に温度設定</mark>できる',
      'エアコンが1台故障しても、他の部屋には影響せず、<mark class="hl-green">全停止リスク</mark>が少ない',
      '子供部屋など、将来使う部屋は必要になってから<mark class="hl-green">最新機種を導入</mark>できる',
      '家電量販店などで、<mark class="hl-green">高性能な最新機種</mark>や<mark class="hl-green">前年モデル</mark>など、自由に選ぶことができる',
      'エアコンの<mark class="hl-green">清掃業者</mark>が見つけやすい',
      '将来の酷暑のときにも<mark class="hl-green">冷房力不足</mark>になる心配が最も少ない',
    ],
    cons: [
      'エアコンの台数が増えるため、<mark class="hl-red">初期費用</mark>が高くなりやすい',
      '寒冷地用エアコンの平均寿命は約10〜13年ほど。交換台数が多くなると<mark class="hl-red">交換費用</mark>が高くなりやすい',
      'エアコン台数分の<mark class="hl-red">フィルター掃除</mark>や交換の手間がかかる',
      'エアコンの<mark class="hl-red">室外機</mark>が多くなり、外観設計時に考慮が必要',
      'エアコンのある空間とない空間で<mark class="hl-red">温度ムラ</mark>が出やすい',
    ],
    color: '#4a7de8',
    icon: '',
  },
  smart: {
    id: 'smart',
    name: '分配空調',
    catch: '快適性とリスクヘッジの両立',
    subtitle: '2台+ダクトで家全体を快適に',
    price: '約67.6万円〜',
    electricity: '必要な時だけ運転でき、2台なので経済的',
    maintenance: '一般のエアコン清掃業者に依頼可能。交換も市販品2台のみ',
    lcc: '最も経済的（市販2台の交換のみ）',
    description: '市販エアコン2台と、それを分配するダクトファン。シンプルな構成で家全体を空調します。',
    bestFor: [],
    worstFor: [],
    features: [
      '市販の壁掛けエアコン2台（各階1台）+ ダクト配管',
      '冬は床下への暖気分配でヒートショック対策',
      '各部屋のダクトに風量調整ダイヤルあり',
      '1台故障しても、もう1台で最低限の空調を維持',
    ],
    pros: [
      'エアコンの台数が家中で2台で済むため、<mark class="hl-green">初期費用</mark>が少ない',
      '寒冷地用エアコンの平均寿命は約10〜13年ほど。交換台数が2台で済むため<mark class="hl-green">交換費用</mark>が少ない',
      'ダクトファンを使って床下へ温風を分配するため、床下から<mark class="hl-green">輻射熱</mark>で暖められる',
      'エアコンから離れた1Fの空間も床下から暖めることができる（床面<mark class="hl-green">18〜20℃</mark>を目安）',
      'エアコンが1台故障しても、もう1台稼働しているため、<mark class="hl-green">全停止リスク</mark>が少ない',
      '交換時は、家電量販店などで、<mark class="hl-green">最新機種</mark>などをある程度自由に選ぶことができる',
      'エアコンの<mark class="hl-green">清掃業者</mark>が見つけやすい',
    ],
    cons: [
      '部屋ごとの<mark class="hl-red">個別温度設定</mark>はできない（分配ダクトファンの風量調整のみが可能）',
      '<mark class="hl-red">5〜10年おき</mark>に、分配ダクトの清掃が必要となる',
      '分配ダクトファンの寿命は<mark class="hl-red">10〜15年</mark>ほど。交換費用が必要となる',
      '風量を大きくしたときは<mark class="hl-red">風切り音</mark>が発生することがある',
      '短いダクトで空間同士がつながっている場合、<mark class="hl-red">音が筒抜け</mark>になる場合がある',
    ],
    color: '#e8734a',
    icon: '',
  },
  zenkan: {
    id: 'zenkan',
    name: '全館空調',
    catch: '究極の快適性と空間の自由',
    subtitle: 'フルスペック全館空調システム',
    price: '約366万円',
    electricity: '24時間連続運転が前提のため、電気代は高め',
    maintenance: '専門業者限定。交換時も専用品のため高額で選択肢がない',
    lcc: '最も高額（専用品交換・専門業者のみ）',
    description: '家中の冷暖房を、くらし方に合わせてコントロールする全館空調システム。',
    bestFor: [],
    worstFor: [],
    features: [
      '各部屋に温度センサー搭載・自動制御',
      '24時間全自動で家全体の温度管理',
      '吹き抜け・リビング階段でも快適',
      '操作の手間がほぼゼロ',
    ],
    pros: [
      '「子供が遊ぶ部屋は少し涼しく」「寝室は暖かく」など、<mark class="hl-green">部屋別に温度設定</mark>できる',
      '<mark class="hl-green">静電HEPAフィルター</mark>によって、家中の空気清浄ができる',
      'フィルターの掃除やメンテナンスが<mark class="hl-green">一箇所に集約</mark>されており、負担が少ない',
    ],
    cons: [
      '<mark class="hl-red">初期費用</mark>が他の空調方式と比較して高くなる',
      'エアコンが寿命を迎えた場合、最新モデルの<mark class="hl-red">専用品</mark>との交換となるため、選択肢がない',
      '1台の専用機で全館を賄うため、故障時は家全体の<mark class="hl-red">空調が停止</mark>',
      '24時間連続運転が前提のため、<mark class="hl-red">電気代</mark>が高くなりやすい',
      '清掃は<mark class="hl-red">専門業者</mark>に限定される',
      '1台で家中を冷暖房する仕様上、将来の酷暑の際、<mark class="hl-red">冷房力が不足</mark>する懸念がある',
    ],
    color: '#4ab87a',
    icon: '',
  },
};
